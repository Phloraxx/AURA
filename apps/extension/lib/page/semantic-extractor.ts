import {
  pageRepresentationSchema,
  type PageElementRepresentation,
  type PageRepresentation,
} from '@aura/shared';

import type { ElementRegistry } from './element-registry';

const MAX_ELEMENTS = 80;
const CANDIDATE_SELECTOR = [
  'main',
  '[role="main"]',
  'article',
  'nav',
  'aside',
  'section',
  'form',
  'fieldset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'a[href]',
  'button',
  'input:not([type="hidden"]):not([type="password"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="alert"]',
].join(',');

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

function boundedText(element: Element, limit: number): string | undefined {
  const value = (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
  return value ? value.slice(0, limit) : undefined;
}

function accessibleName(element: Element): string | undefined {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel.slice(0, 200);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const value = labelledBy
      .split(/\s+/u)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim();
    if (value) return value.slice(0, 200);
  }
  if (element instanceof HTMLInputElement && element.id) {
    const label = Array.from(element.labels ?? [])
      .map((item) => item.textContent ?? '')
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim();
    if (label) return label.slice(0, 200);
  }
  const title = element.getAttribute('title')?.trim();
  if (title) return title.slice(0, 200);
  return boundedText(element, 200);
}

function elementKind(element: Element): PageElementRepresentation['kind'] {
  if (element.matches('main, article, nav, aside, section, [role="main"]')) {
    return 'landmark';
  }
  if (/^H[1-6]$/u.test(element.tagName)) return 'heading';
  if (element.matches('form, fieldset')) return 'form_group';
  if (
    element.matches(
      'a[href], button, input, select, textarea, [role="button"], [role="link"]',
    )
  ) {
    return 'control';
  }
  return 'text';
}

function inputKind(element: Element): PageElementRepresentation['inputKind'] {
  if (element.matches('a[href], [role="link"]')) return 'link';
  if (element.matches('button, [role="button"]')) return 'button';
  if (element instanceof HTMLSelectElement) return 'select';
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') return 'checkbox';
    if (element.type === 'radio') return 'radio';
    return ['button', 'submit', 'reset'].includes(element.type) ? 'button' : 'text';
  }
  return undefined;
}

function isCritical(element: Element, name: string | undefined, text: string | undefined) {
  if (element.matches('[aria-invalid="true"], [role="alert"], [required]')) return true;
  const ancestorContext = element
    .closest('form, section, article, aside')
    ?.textContent?.replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 400);
  const context = `${name ?? ''} ${text ?? ''} ${element.getAttribute('name') ?? ''} ${ancestorContext ?? ''}`;
  return CRITICAL_PATTERN.test(context);
}

export function extractPageRepresentation(
  document: Document,
  registry: ElementRegistry,
): PageRepresentation {
  registry.registerSubtree(document);
  const candidates = Array.from(document.querySelectorAll(CANDIDATE_SELECTOR)).filter(
    isVisible,
  );
  const elements = candidates.slice(0, MAX_ELEMENTS).map((element) => {
    const kind = elementKind(element);
    const text = kind === 'control' ? undefined : boundedText(element, 400);
    const name = kind === 'control' || kind === 'form_group' ? accessibleName(element) : undefined;
    const headingMatch = /^H([1-6])$/u.exec(element.tagName);
    return {
      id: registry.getId(element) ?? registry.register(element),
      kind,
      tag: element.tagName.toLowerCase(),
      ...(element.getAttribute('role') ? { role: element.getAttribute('role') ?? undefined } : {}),
      ...(text ? { text } : {}),
      ...(name ? { accessibleName: name } : {}),
      ...(inputKind(element) ? { inputKind: inputKind(element) } : {}),
      ...(headingMatch ? { headingLevel: Number(headingMatch[1]) } : {}),
      critical: isCritical(element, name, text),
    } satisfies PageElementRepresentation;
  });

  return pageRepresentationSchema.parse({
    title: document.title.slice(0, 200),
    ...(document.documentElement.lang
      ? { language: document.documentElement.lang.slice(0, 35) }
      : {}),
    elements,
    truncated: candidates.length > MAX_ELEMENTS,
  });
}
