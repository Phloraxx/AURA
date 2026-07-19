import type { FrictionCategory, FrictionSignal } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const READING_SELECTOR = 'article, main, [role="main"], section';
const CRITICAL_PATTERN =
  /\b(pay|payment|purchase|checkout|sign[ -]?in|log[ -]?in|password|security|warning|error|required|consent|agree|legal|terms|privacy|medical|financial)\b/iu;

function isVisible(element: Element): boolean {
  if (
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.closest('[data-aura-owned]')
  ) {
    return false;
  }
  if (element instanceof HTMLElement) {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }
  return true;
}

function textOf(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
}

function numeric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function computedDimension(element: Element, axis: 'width' | 'height'): number | undefined {
  const rect = element.getBoundingClientRect();
  const rectValue = axis === 'width' ? rect.width : rect.height;
  if (rectValue > 0) return rectValue;

  const style = getComputedStyle(element);
  const direct = numeric(axis === 'width' ? style.width : style.height);
  const minimum = numeric(axis === 'width' ? style.minWidth : style.minHeight);
  if (direct && direct > 0) return Math.max(direct, minimum ?? 0);
  if (minimum && minimum > 0) return minimum;

  const paddingStart = numeric(axis === 'width' ? style.paddingLeft : style.paddingTop) ?? 0;
  const paddingEnd = numeric(axis === 'width' ? style.paddingRight : style.paddingBottom) ?? 0;
  const lineHeight = numeric(style.lineHeight) ?? numeric(style.fontSize);
  if (lineHeight && paddingStart + paddingEnd > 0) {
    return lineHeight + paddingStart + paddingEnd;
  }
  return undefined;
}

function targetSize(element: Element): number | undefined {
  const width = computedDimension(element, 'width');
  const height = computedDimension(element, 'height');
  if (width === undefined && height === undefined) return undefined;
  return Math.min(width ?? Number.POSITIVE_INFINITY, height ?? Number.POSITIVE_INFINITY);
}

function accessibleNameHint(element: Element): string | undefined {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const value = labelledBy
      .split(/\s+/u)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim();
    if (value) return value;
  }

  if (element instanceof HTMLInputElement && element.labels?.length) {
    const value = Array.from(element.labels)
      .map((label) => label.textContent ?? '')
      .join(' ')
      .trim();
    if (value) return value;
  }

  const title = element.getAttribute('title')?.trim();
  if (title) return title;
  const text = textOf(element);
  return text || element.getAttribute('alt')?.trim() || undefined;
}

function isCritical(element: Element): boolean {
  if (
    element.matches('[required], [aria-invalid="true"], [role="alert"], input[type="password"]') ||
    element.querySelector('[required], [aria-invalid="true"], [role="alert"], input[type="password"]')
  ) {
    return true;
  }
  return CRITICAL_PATTERN.test(textOf(element).slice(0, 600));
}

function hasAnimationRule(document: Document, element: Element): boolean {
  try {
    return Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules).some((rule) => {
          if (!(rule instanceof CSSStyleRule)) return false;
          return (
            /animation(?:-name)?\s*:/iu.test(rule.cssText) &&
            element.matches(rule.selectorText)
          );
        });
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function signal(
  category: FrictionCategory,
  index: number,
  targetIds: string[],
  severity: number,
  confidence: number,
  reason: string,
  critical = false,
): FrictionSignal {
  return {
    id: `local:${category}:${index}`,
    category,
    targetIds: targetIds.slice(0, 10),
    severity,
    confidence,
    source: 'local',
    reason,
    critical,
  };
}

function idFor(registry: ElementRegistry, element: Element): string {
  return registry.getId(element) ?? registry.register(element);
}

function readableRegions(document: Document): Element[] {
  const candidates = Array.from(document.querySelectorAll(READING_SELECTOR)).filter(isVisible);
  const articles = candidates.filter((element) => element.matches('article'));
  if (articles.length > 0) return articles.slice(0, 8);
  return candidates
    .filter((element) => !element.parentElement?.closest(READING_SELECTOR))
    .slice(0, 8);
}

export function scanLocalFriction(
  document: Document,
  registry: ElementRegistry,
): FrictionSignal[] {
  registry.registerSubtree(document);
  const signals: FrictionSignal[] = [];
  let index = 1;
  const add = (
    category: FrictionCategory,
    targetIds: string[],
    severity: number,
    confidence: number,
    reason: string,
    critical = false,
  ) => {
    signals.push(signal(category, index, targetIds, severity, confidence, reason, critical));
    index += 1;
  };

  readableRegions(document).forEach((region) => {
    const text = textOf(region);
    const paragraphs = region.querySelectorAll('p, li, blockquote').length;
    const style = getComputedStyle(region);
    const fontSize = numeric(style.fontSize);
    const lineHeight = numeric(style.lineHeight);
    const denseReading = text.length >= 320 && paragraphs >= 3;
    const smallText = fontSize !== undefined && fontSize < 15;
    const tightLines = lineHeight !== undefined && fontSize !== undefined && lineHeight / fontSize < 1.2;
    if (denseReading || smallText || tightLines) {
      add(
        'readability',
        [idFor(registry, region)],
        denseReading ? 0.55 : 0.7,
        denseReading ? 0.78 : 0.9,
        denseReading
          ? 'This reading region contains a long sequence of text that may be harder to scan.'
          : 'This reading region uses compact text presentation.',
        isCritical(region),
      );
    }

    const words = text.split(/\s+/u).filter(Boolean);
    const longWords = words.filter((word) => word.replace(/[^a-z]/giu, '').length >= 11).length;
    if (words.length >= 45 && longWords / words.length >= 0.08) {
      add(
        'language_complexity',
        [idFor(registry, region)],
        0.45,
        0.68,
        'This reading region uses longer terminology that may benefit from clearer wording.',
        isCritical(region),
      );
    }
  });

  const interactive = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isVisible);
  const smallTargets = interactive.filter((element) => {
    const size = targetSize(element);
    return size !== undefined && size < 44;
  });
  smallTargets.slice(0, 20).forEach((element) => {
    add(
      'interaction_target',
      [idFor(registry, element)],
      Math.min(0.9, Math.max(0.35, (44 - (targetSize(element) ?? 44)) / 32)),
      0.82,
      'This interactive target appears smaller than a comfortable touch or pointer target.',
      isCritical(element),
    );
  });

  const unnamedControls = interactive.filter((element) => !accessibleNameHint(element));
  unnamedControls.slice(0, 12).forEach((element) => {
    add(
      'control_clarity',
      [idFor(registry, element)],
      0.65,
      0.92,
      'This interactive control does not expose a clear name locally.',
      isCritical(element),
    );
  });

  const main = document.querySelector('main, [role="main"], article');
  const nav = Array.from(document.querySelectorAll('nav, [role="navigation"]')).find(isVisible);
  if (nav && main) {
    const navigationControls = Array.from(nav.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isVisible);
    if (navigationControls.length >= 4) {
      add(
        'focus_navigation',
        [idFor(registry, nav)],
        Math.min(0.8, 0.35 + navigationControls.length / 30),
        0.76,
        'Several navigation controls appear before the main content.',
        false,
      );
    }
  } else if (!main) {
    const body = document.body;
    if (body) {
      add(
        'focus_navigation',
        [idFor(registry, body)],
        0.45,
        0.62,
        'The page does not expose a clear main-content landmark.',
        false,
      );
    }
  }

  const asides = Array.from(document.querySelectorAll('aside, [role="complementary"]')).filter(isVisible);
  if (asides.length > 0 && main) {
    add(
      'attention_clutter',
      asides.slice(0, 6).map((aside) => idFor(registry, aside)),
      Math.min(0.85, 0.45 + asides.length * 0.08),
      0.82,
      'Secondary regions compete with the page’s main content.',
      asides.some(isCritical),
    );
  }

  const forms = Array.from(document.querySelectorAll('form')).filter(isVisible);
  forms.forEach((form) => {
    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(
      isVisible,
    );
    const groups = form.querySelectorAll('fieldset, [role="group"], [data-form-section]').length;
    if (fields.length >= 3 || groups >= 2) {
      const targetId = idFor(registry, form);
      add(
        'form_complexity',
        [targetId],
        Math.min(0.9, 0.35 + fields.length / 18 + groups / 10),
        0.84,
        'This form has several fields or sections that may be easier to complete step by step.',
        isCritical(form),
      );
      if (groups >= 2) {
        add(
          'cognitive_workflow',
          [targetId],
          Math.min(0.8, 0.4 + groups / 10),
          0.78,
          'This form contains multiple logical sections to work through.',
          isCritical(form),
        );
      }
    }
  });

  const animated = Array.from(document.querySelectorAll('*')).filter((element) => {
    if (!isVisible(element)) return false;
    const style = getComputedStyle(element);
    return (
      (style.animationName && style.animationName !== 'none') ||
      Boolean(element.getAttribute('style')?.match(/animation|transition/iu)) ||
      hasAnimationRule(document, element)
    );
  });
  if (animated.length > 0) {
    add(
      'motion',
      animated.slice(0, 8).map((element) => idFor(registry, element)),
      0.55,
      0.72,
      'The page contains animated content that may compete with attention.',
      false,
    );
  }

  const visibleControls = interactive.length;
  if (visibleControls >= 6 && document.querySelector('main, article')) {
    const primaryRegion = document.querySelector('main, article');
    if (primaryRegion) {
      add(
        'control_clarity',
        [idFor(registry, primaryRegion)],
        0.3,
        0.55,
        'Several controls share this page region, so the next useful action may be harder to identify.',
        false,
      );
    }
  }

  return signals;
}
