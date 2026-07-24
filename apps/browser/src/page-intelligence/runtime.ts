import type {
  PageElementCategory,
  PageForm,
  PageModel,
  PageRect,
  PageRegion,
  PageRuntimeCommand,
} from '../shared/page-model';
import {
  calculateExtractionHealth,
  type RankablePageElement,
  scoreElement,
  selectBalancedElements,
  summarizeRepeatedStructures,
} from './ranking';

type CaptureTrigger = PageModel['metrics']['trigger'];

const MAX_TEXT_LENGTH = 600;
const MUTATION_QUIET_WINDOW_MS = 320;
const INITIAL_SETTLE_MAX_MS = 1_200;
const HIGHLIGHT_DURATION_MS = 2_000;

const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'gridcell',
  'link',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]);

const LANDMARK_ROLES = new Set([
  'banner',
  'complementary',
  'contentinfo',
  'dialog',
  'form',
  'main',
  'navigation',
  'region',
  'search',
]);

const UTILITY_LANDMARKS = new Set([
  'banner',
  'complementary',
  'contentinfo',
  'navigation',
]);

const SEMANTIC_TAGS = new Set([
  'a',
  'article',
  'aside',
  'blockquote',
  'button',
  'details',
  'dialog',
  'fieldset',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'img',
  'input',
  'label',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'select',
  'summary',
  'table',
  'textarea',
  'ul',
]);

const OBSERVED_ATTRIBUTES = [
  'aria-checked',
  'aria-expanded',
  'aria-hidden',
  'aria-label',
  'aria-labelledby',
  'aria-selected',
  'class',
  'disabled',
  'for',
  'hidden',
  'href',
  'id',
  'open',
  'role',
  'style',
  'tabindex',
  'type',
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function shorten(value: string): string {
  return value.length <= MAX_TEXT_LENGTH
    ? value
    : `${value.slice(0, MAX_TEXT_LENGTH - 1)}…`;
}

const USER_TEXT_SELECTOR =
  'textarea, [contenteditable=""], [contenteditable="true"], ' +
  '[contenteditable="plaintext-only"]';

function safeTextContent(element: Element): string {
  if (element.matches(USER_TEXT_SELECTOR)) return '';
  if (element.querySelector(USER_TEXT_SELECTOR) === null) {
    return element.textContent ?? '';
  }
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) return '';
  for (const userTextElement of clone.querySelectorAll(USER_TEXT_SELECTOR)) {
    userTextElement.remove();
  }
  return clone.textContent ?? '';
}

function parsePixelValue(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function rectFor(element: Element): PageRect | null {
  const rect = element.getBoundingClientRect();
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height)
  ) {
    return null;
  }
  return {
    height: round(Math.max(0, rect.height)),
    width: round(Math.max(0, rect.width)),
    x: round(rect.x),
    y: round(rect.y),
  };
}

function getReferencedText(element: Element, attribute: string): string {
  const ids = normalizeText(element.getAttribute(attribute)).split(' ');
  if (ids.length === 0) return '';
  return normalizeText(
    ids
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' '),
  );
}

function getNativeLabel(element: Element): string {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLOutputElement
  ) {
    const labels = element.labels;
    if (labels !== null && labels.length > 0) {
      return normalizeText(
        [...labels].map((label) => label.textContent ?? '').join(' '),
      );
    }
  }

  if (element instanceof HTMLFieldSetElement) {
    return normalizeText(
      element.querySelector(':scope > legend')?.textContent ?? '',
    );
  }
  if (element instanceof HTMLTableElement) {
    return normalizeText(element.caption?.textContent ?? '');
  }
  if (element instanceof HTMLImageElement || element instanceof HTMLAreaElement) {
    return normalizeText(element.alt);
  }
  if (
    element instanceof HTMLInputElement &&
    element.type.toLocaleLowerCase() === 'image'
  ) {
    return normalizeText(element.alt);
  }
  if (element instanceof HTMLElement && element.tagName === 'FIGURE') {
    return normalizeText(
      element.querySelector(':scope > figcaption')?.textContent ?? '',
    );
  }
  return '';
}

function implicitRole(element: Element): string | null {
  const tag = element.tagName.toLocaleLowerCase();
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'a' && element.hasAttribute('href')) return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'main') return 'main';
  if (tag === 'nav') return 'navigation';
  if (tag === 'aside') return 'complementary';
  if (tag === 'footer') return 'contentinfo';
  if (tag === 'form') return 'form';
  if (tag === 'dialog') return 'dialog';
  if (tag === 'ul' || tag === 'ol') return 'list';
  if (tag === 'li') return 'listitem';
  if (tag === 'table') return 'table';
  if (tag === 'img') return 'img';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'select') return 'combobox';
  if (tag === 'summary') return 'button';

  if (element instanceof HTMLInputElement) {
    const inputRoles: Record<string, string | null> = {
      button: 'button',
      checkbox: 'checkbox',
      color: 'button',
      email: 'textbox',
      image: 'button',
      number: 'spinbutton',
      radio: 'radio',
      range: 'slider',
      reset: 'button',
      search: 'searchbox',
      submit: 'button',
      tel: 'textbox',
      text: 'textbox',
      url: 'textbox',
    };
    return inputRoles[element.type.toLocaleLowerCase()] ?? null;
  }

  return null;
}

function accessibleNameFor(element: Element, role: string | null): string | null {
  const labelledBy = getReferencedText(element, 'aria-labelledby');
  if (labelledBy.length > 0) return shorten(labelledBy);

  const ariaLabel = normalizeText(element.getAttribute('aria-label'));
  if (ariaLabel.length > 0) return shorten(ariaLabel);

  const nativeLabel = getNativeLabel(element);
  if (nativeLabel.length > 0) return shorten(nativeLabel);

  if (
    element instanceof HTMLInputElement &&
    ['button', 'reset', 'submit'].includes(element.type.toLocaleLowerCase())
  ) {
    const value = normalizeText(element.value);
    if (value.length > 0) return shorten(value);
  }

  const contentNamed =
    role === 'button' ||
    role === 'heading' ||
    role === 'link' ||
    role === 'listitem' ||
    role === 'menuitem' ||
    role === 'option' ||
    role === 'tab' ||
    element.tagName.toLocaleLowerCase() === 'summary';
  if (contentNamed) {
    const content = normalizeText(element.textContent);
    if (content.length > 0) return shorten(content);
  }

  const title = normalizeText(element.getAttribute('title'));
  if (title.length > 0) return shorten(title);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const placeholder = normalizeText(element.placeholder);
    if (placeholder.length > 0) return shorten(placeholder);
  }

  return null;
}

function isInteractive(element: Element, role: string | null): boolean {
  const tag = element.tagName.toLocaleLowerCase();
  if (
    ['button', 'input', 'select', 'summary', 'textarea'].includes(tag) ||
    (tag === 'a' && element.hasAttribute('href'))
  ) {
    return true;
  }
  if (role !== null && INTERACTIVE_ROLES.has(role)) return true;
  if (element.getAttribute('contenteditable') === 'true') return true;
  const tabIndex = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
  return Number.isFinite(tabIndex) && tabIndex >= 0;
}

function landmarkFor(element: Element, role: string | null): string | null {
  if (role !== null && LANDMARK_ROLES.has(role)) return role;
  const tag = element.tagName.toLocaleLowerCase();
  const byTag: Record<string, string> = {
    aside: 'complementary',
    dialog: 'dialog',
    footer: 'contentinfo',
    form: 'form',
    main: 'main',
    nav: 'navigation',
  };
  if (tag === 'header' && element.closest('article, aside, main, section') === null) {
    return 'banner';
  }
  return byTag[tag] ?? null;
}

function categoryFor(
  element: Element,
  role: string | null,
  interactive: boolean,
  landmark: string | null,
): PageElementCategory {
  const tag = element.tagName.toLocaleLowerCase();
  if (/^h[1-6]$/.test(tag) || role === 'heading') return 'heading';
  if (tag === 'form' || role === 'form') return 'form';
  if (interactive) return 'control';
  if (landmark === 'navigation') return 'navigation';
  if (landmark !== null || ['article', 'section'].includes(tag)) return 'region';
  if (tag === 'table' || role === 'table' || role === 'grid') return 'table';
  if (['li', 'ol', 'ul'].includes(tag) || ['list', 'listitem'].includes(role ?? '')) {
    return 'list';
  }
  if (['figure', 'img'].includes(tag) || role === 'img') return 'media';
  return 'text';
}

function isVisible(element: Element, style: CSSStyleDeclaration, rect: PageRect | null): boolean {
  if (
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true' ||
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse' ||
    Number.parseFloat(style.opacity) === 0
  ) {
    return false;
  }
  return rect !== null && rect.width > 0 && rect.height > 0;
}

function isInViewport(rect: PageRect | null): boolean {
  if (rect === null) return false;
  return (
    rect.x < window.innerWidth &&
    rect.y < window.innerHeight &&
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0
  );
}

function directTextLength(element: Element): number {
  return normalizeText(
    [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join(' '),
  ).length;
}

function isEligible(
  element: Element,
  role: string | null,
  interactive: boolean,
  landmark: string | null,
  textLength: number,
): boolean {
  const tag = element.tagName.toLocaleLowerCase();
  if (interactive || role !== null || landmark !== null || SEMANTIC_TAGS.has(tag)) {
    if (tag === 'p' || tag === 'li' || tag === 'label') return textLength >= 20;
    if (tag === 'img') return accessibleNameFor(element, role) !== null;
    return true;
  }
  return (
    directTextLength(element) >= 80 &&
    ['div', 'dd', 'dt', 'td', 'th'].includes(tag)
  );
}

function classSignature(element: Element): string {
  return [...element.classList]
    .map((name) => name.replace(/\d+/g, '#'))
    .filter((name) => name.length > 0)
    .sort()
    .slice(0, 3)
    .join('.');
}

function repetitionKeyFor(
  element: Element,
  category: PageElementCategory,
  role: string | null,
): string | null {
  let structuralNode: Element | null = element;
  for (let depth = 0; depth < 3 && structuralNode !== null; depth += 1) {
    const currentNode: Element = structuralNode;
    const parentElement: HTMLElement | null = currentNode.parentElement;
    if (parentElement === null) return null;
    const siblings = [...parentElement.children].filter(
      (sibling) =>
        sibling.tagName === currentNode.tagName &&
        classSignature(sibling) === classSignature(currentNode),
    );
    if (siblings.length >= 3) {
      return [
        parentElement.tagName.toLocaleLowerCase(),
        classSignature(parentElement),
        currentNode.tagName.toLocaleLowerCase(),
        classSignature(currentNode),
        depth,
        role ?? '',
        category,
      ].join('|');
    }
    structuralNode = parentElement;
  }
  return null;
}

function stateBoolean(
  element: Element,
  ariaAttribute: string,
  nativeValue: boolean | undefined,
): boolean | null {
  const ariaValue = element.getAttribute(ariaAttribute);
  if (ariaValue === 'true') return true;
  if (ariaValue === 'false') return false;
  return nativeValue ?? null;
}

function visualProminenceFor(
  rect: PageRect | null,
  style: CSSStyleDeclaration,
): number {
  if (rect === null) return 0;
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const areaRatio = Math.min(1, (rect.width * rect.height) / viewportArea);
  const fontRatio = Math.min(1, (parsePixelValue(style.fontSize) ?? 0) / 36);
  const weight = Number.parseInt(style.fontWeight, 10);
  const weightRatio = Number.isFinite(weight) ? Math.min(1, weight / 900) : 0.4;
  return Math.min(1, areaRatio * 0.45 + fontRatio * 0.4 + weightRatio * 0.15);
}

function collectElements(): Element[] {
  const output: Element[] = [];
  const roots: ParentNode[] = [document];
  const seen = new Set<Element>();

  while (roots.length > 0) {
    const root = roots.shift();
    if (root === undefined) break;
    for (const element of root.querySelectorAll('*')) {
      if (seen.has(element)) continue;
      seen.add(element);
      if (element.closest('[data-aura-owned]') !== null) continue;
      output.push(element);
      if (element.shadowRoot !== null) roots.push(element.shadowRoot);
    }
  }
  return output;
}

function buildCandidate(
  element: Element,
  sourceOrder: number,
  ensureAuraId: (element: Element) => string,
): RankablePageElement | null {
  const role = normalizeText(element.getAttribute('role')) || implicitRole(element);
  const interactive = isInteractive(element, role);
  const landmark = landmarkFor(element, role);
  const rawText = normalizeText(safeTextContent(element));
  const textLength = rawText.length;
  if (!isEligible(element, role, interactive, landmark, textLength)) return null;

  const style = window.getComputedStyle(element);
  const rect = rectFor(element);
  const visible = isVisible(element, style, rect);
  if (!visible) return null;

  const auraId = ensureAuraId(element);
  const category = categoryFor(element, role, interactive, landmark);
  const form = element.closest('form');
  const headingMatch = /^h([1-6])$/.exec(element.tagName.toLocaleLowerCase());
  const ariaLevel = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);
  const headingLevel =
    headingMatch?.[1] !== undefined
      ? Number.parseInt(headingMatch[1], 10)
      : role === 'heading' && Number.isFinite(ariaLevel)
        ? ariaLevel
        : null;
  const href =
    element instanceof HTMLAnchorElement && element.href.startsWith('http')
      ? element.href
      : null;
  const disabled =
    'disabled' in element && typeof element.disabled === 'boolean'
      ? element.disabled
      : element.getAttribute('aria-disabled') === 'true';
  const checked =
    element instanceof HTMLInputElement &&
    ['checkbox', 'radio'].includes(element.type)
      ? element.checked
      : undefined;
  const selected =
    element instanceof HTMLOptionElement ? element.selected : undefined;

  const candidate: RankablePageElement = {
    accessibleName: accessibleNameFor(element, role),
    auraId,
    category,
    childCount: element.children.length,
    display: style.display || null,
    fontSizePx: parsePixelValue(style.fontSize),
    fontWeight: style.fontWeight || null,
    formAuraId: form === null ? null : ensureAuraId(form),
    headingLevel,
    href,
    inViewport: isInViewport(rect),
    inputType:
      element instanceof HTMLInputElement
        ? element.type.toLocaleLowerCase()
        : null,
    insidePrimaryContent:
      element.closest('main, article, [role="main"]') !== null,
    insideUtilityRegion:
      [...UTILITY_LANDMARKS].some(
        (utilityRole) =>
          element.closest(
            `${utilityRole === 'navigation' ? 'nav,' : ''}[role="${utilityRole}"]`,
          ) !== null,
      ) || element.closest('footer') !== null,
    interactive,
    landmark,
    lineHeightPx: parsePixelValue(style.lineHeight),
    position: style.position || null,
    rect,
    repetitionKey: null,
    role,
    score: 0,
    sourceOrder,
    states: {
      checked: stateBoolean(element, 'aria-checked', checked),
      disabled,
      expanded: stateBoolean(element, 'aria-expanded', undefined),
      selected: stateBoolean(element, 'aria-selected', selected),
    },
    tag: element.tagName.toLocaleLowerCase(),
    text:
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement ||
      element.getAttribute('contenteditable') === '' ||
      element.getAttribute('contenteditable') === 'true' ||
      element.getAttribute('contenteditable') === 'plaintext-only'
        ? null
        : rawText.length === 0
          ? null
          : shorten(rawText),
    textLength,
    visible,
    visualProminence: visualProminenceFor(rect, style),
  };
  candidate.repetitionKey = repetitionKeyFor(element, category, role);
  candidate.score = scoreElement(candidate);
  return candidate;
}

function createPageId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface PageIntelligenceRuntime {
  capture: (trigger: CaptureTrigger) => PageModel;
  handleCommand: (command: PageRuntimeCommand) => boolean;
  start: () => void;
  stop: () => void;
}

export function createPageIntelligenceRuntime(
  onModel: (model: PageModel) => void,
): PageIntelligenceRuntime {
  const pageId = createPageId();
  const auraIds = new WeakMap<Element, string>();
  let nextAuraId = 1;
  let revision = 0;
  let mutationCount = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;

  function ensureAuraId(element: Element): string {
    const existing = auraIds.get(element) ?? element.getAttribute('data-aura-id');
    if (existing !== null && existing !== undefined && existing.length > 0) {
      auraIds.set(element, existing);
      if (element.getAttribute('data-aura-id') !== existing) {
        element.setAttribute('data-aura-id', existing);
      }
      return existing;
    }
    const auraId = `aura-${nextAuraId}`;
    nextAuraId += 1;
    auraIds.set(element, auraId);
    element.setAttribute('data-aura-id', auraId);
    return auraId;
  }

  function capture(trigger: CaptureTrigger): PageModel {
    const startedAt = performance.now();
    const candidates = collectElements()
      .map((element, index) => buildCandidate(element, index, ensureAuraId))
      .filter((element): element is RankablePageElement => element !== null);
    const repeatedStructures = summarizeRepeatedStructures(candidates);
    const elements = selectBalancedElements(candidates);
    revision += 1;

    const selectedById = new Map(
      elements.map((element) => [element.auraId, element]),
    );
    const regions: PageRegion[] = elements
      .filter(
        (element) =>
          element.category === 'region' ||
          element.category === 'navigation' ||
          element.category === 'form',
      )
      .map((element) => ({
        accessibleName: element.accessibleName,
        auraId: element.auraId,
        inViewport: element.inViewport,
        landmark: element.landmark,
        rect: element.rect,
        role: element.role,
        tag: element.tag,
      }));
    const forms: PageForm[] = candidates
      .filter((element) => element.category === 'form')
      .map((form) => {
        const controls = elements.filter(
          (element) => element.formAuraId === form.auraId && element.interactive,
        );
        return {
          accessibleName: form.accessibleName,
          auraId: form.auraId,
          controlAuraIds: controls.map((control) => control.auraId),
          labeledControlCount: controls.filter(
            (control) => control.accessibleName !== null,
          ).length,
          totalControlCount: controls.length,
        };
      })
      .filter((form, index, allForms) => {
        return allForms.findIndex((candidate) => candidate.auraId === form.auraId) === index;
      });
    const visibleAuraIds = candidates
      .filter(
        (element) =>
          element.inViewport &&
          selectedById.has(element.auraId) &&
          element.visible,
      )
      .map((element) => element.auraId);

    const model: PageModel = {
      capturedAt: new Date().toISOString(),
      elements,
      extractionHealth: calculateExtractionHealth(elements),
      forms,
      metrics: {
        candidateCount: candidates.length,
        captureDurationMs: round(performance.now() - startedAt),
        mutationCount,
        selectedCount: elements.length,
        trigger,
      },
      pageId,
      privacy: {
        hasEditableControl:
          document.querySelector(
            'input:not([type="button"]):not([type="checkbox"]):not([type="color"]):not([type="hidden"]):not([type="image"]):not([type="radio"]):not([type="range"]):not([type="reset"]):not([type="submit"]), textarea, [contenteditable="true"]',
          ) !== null,
        hasNonEmptyEditableControl: [
          ...document.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLElement
          >(
            'input:not([type="button"]):not([type="checkbox"]):not([type="color"]):not([type="hidden"]):not([type="image"]):not([type="radio"]):not([type="range"]):not([type="reset"]):not([type="submit"]), textarea, [contenteditable="true"]',
          ),
        ].some((element) => {
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            return element.value.length > 0;
          }
          return (element.textContent?.trim().length ?? 0) > 0;
        }),
        hasPasswordControl:
          document.querySelector('input[type="password"]') !== null,
      },
      regions,
      repeatedStructures,
      revision,
      schemaVersion: 1,
      title: document.title,
      url: window.location.href,
      viewport: {
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        width: window.innerWidth,
      },
      visibleAuraIds: [...new Set(visibleAuraIds)],
    };
    mutationCount = 0;
    return model;
  }

  function publish(trigger: CaptureTrigger): void {
    onModel(capture(trigger));
  }

  function scheduleCapture(trigger: CaptureTrigger): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      publish(trigger);
    }, MUTATION_QUIET_WINDOW_MS);
  }

  function handleCommand(command: PageRuntimeCommand): boolean {
    if (command.pageId !== pageId || command.revision !== revision) return false;
    if (command.type === 'capture-now') {
      publish('manual');
      return true;
    }
    const target = collectElements().find(
      (element) => element.getAttribute('data-aura-id') === command.auraId,
    );
    if (!(target instanceof HTMLElement)) return false;
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    if (command.type === 'highlight-target') {
      const previousOutline = target.style.outline;
      const previousOffset = target.style.outlineOffset;
      target.style.outline = '4px solid #005fcc';
      target.style.outlineOffset = '4px';
      window.setTimeout(() => {
        target.style.outline = previousOutline;
        target.style.outlineOffset = previousOffset;
      }, HIGHLIGHT_DURATION_MS);
    }
    return true;
  }

  function start(): void {
    observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      scheduleCapture('mutation');
    });

    const beginObservation = (): void => {
      if (document.documentElement === null || observer === null) return;
      observer.observe(document.documentElement, {
        attributeFilter: OBSERVED_ATTRIBUTES,
        attributes: true,
        childList: true,
        subtree: true,
      });
    };
    window.addEventListener('hashchange', () => scheduleCapture('route-change'));
    window.addEventListener('popstate', () => scheduleCapture('route-change'));

    const captureDomReady = (): void => {
      beginObservation();
      scheduleCapture('dom-ready');
      settleTimer = setTimeout(() => {
        if (revision === 0) publish('dom-ready');
      }, INITIAL_SETTLE_MAX_MS);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', captureDomReady, {
        once: true,
      });
    } else {
      captureDomReady();
    }
  }

  function stop(): void {
    observer?.disconnect();
    observer = null;
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    if (settleTimer !== null) clearTimeout(settleTimer);
  }

  return { capture, handleCommand, start, stop };
}
