import type {
  AdaptationCommand,
  AdaptationEvent,
  PresentationSettings,
} from '../shared/adaptation';
import type { SemanticPlan } from '../shared/semantic-analysis';

const ROOT_ATTRIBUTE = 'data-aura-presentation';
const READING_ATTRIBUTE = 'data-aura-reading-region';
const STYLE_ATTRIBUTE = 'data-aura-presentation-style';
const SEMANTIC_STYLE_ATTRIBUTE = 'data-aura-semantic-style';
const OWNED_ATTRIBUTE = 'data-aura-owned';
const PRIMARY_ATTRIBUTE = 'data-aura-primary';
const SECONDARY_ATTRIBUTE = 'data-aura-secondary';
const HIGHLIGHT_ATTRIBUTE = 'data-aura-highlight';
const COLLAPSED_ATTRIBUTE = 'data-aura-collapsed';

interface AttributeRecord {
  element: Element;
  name: string;
  value: string | null;
}

interface PresentationSession {
  attributes: AttributeRecord[];
  generatedNodes: HTMLElement[];
  pageId: string;
  semanticPlan: SemanticPlan | null;
  settings: PresentationSettings;
  view: 'aura' | 'original';
}

function escapeCssNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function chooseReadingRegion(): HTMLElement | null {
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(
      'main, [role="main"], article',
    ),
  ].filter((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 520 &&
      (element.textContent?.trim().length ?? 0) > 400
    );
  });
  candidates.sort((left, right) => {
    const leftNested = left.closest('main, [role="main"]') === left ? 0 : 1;
    const rightNested = right.closest('main, [role="main"]') === right ? 0 : 1;
    if (leftNested !== rightNested) return rightNested - leftNested;
    return (right.textContent?.length ?? 0) - (left.textContent?.length ?? 0);
  });
  return candidates[0] ?? null;
}

function buildStyles(
  settings: PresentationSettings,
  rootFontSizePx: number,
): string {
  const scaledRoot = escapeCssNumber(rootFontSizePx * settings.textScale);
  const lineSpacing = escapeCssNumber(settings.lineSpacing);
  const targetSize = escapeCssNumber(settings.targetSizePx);
  const rules = [
    `html[${ROOT_ATTRIBUTE}="on"] { font-size: ${scaledRoot}px !important; }`,
    `html[${ROOT_ATTRIBUTE}="on"] :where(p, blockquote, dd, dt, figcaption, label, td, th, li:not(:has(p, ul, ol))) { line-height: ${lineSpacing} !important; }`,
    `html[${ROOT_ATTRIBUTE}="on"] :where(button, summary, input:not([type="hidden"]), select, textarea, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"]) { min-block-size: ${targetSize}px !important; }`,
  ];
  if (settings.readingWidth === 'narrow') {
    rules.push(
      `html[${ROOT_ATTRIBUTE}="on"] [${READING_ATTRIBUTE}="on"] { box-sizing: border-box !important; inline-size: min(100%, 72ch) !important; max-inline-size: 72ch !important; margin-inline: auto !important; }`,
    );
  }
  if (settings.strongFocus) {
    rules.push(
      `html[${ROOT_ATTRIBUTE}="on"] :focus-visible { outline: 4px solid #005fcc !important; outline-offset: 4px !important; }`,
    );
  }
  if (settings.reduceMotion) {
    rules.push(
      `html[${ROOT_ATTRIBUTE}="on"] *, html[${ROOT_ATTRIBUTE}="on"] *::before, html[${ROOT_ATTRIBUTE}="on"] *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }`,
    );
  }
  return rules.join('\n');
}

function findAuraTarget(auraId: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>('[data-aura-id]')].find(
      (element) => element.getAttribute('data-aura-id') === auraId,
    ) ?? null
  );
}

function elementDepth(element: Element): number {
  let depth = 0;
  for (
    let parent = element.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    depth += 1;
  }
  return depth;
}

function chooseNonOverlappingHighlights(
  auraIds: string[],
): HTMLElement[] {
  const candidates = auraIds
    .map(findAuraTarget)
    .filter((target): target is HTMLElement => target !== null)
    .sort((left, right) => elementDepth(right) - elementDepth(left));
  const selected: HTMLElement[] = [];
  for (const candidate of candidates) {
    if (
      selected.some(
        (item) => candidate.contains(item) || item.contains(candidate),
      )
    ) {
      continue;
    }
    selected.push(candidate);
  }
  return selected;
}

function semanticStyles(): string {
  return `
html[${ROOT_ATTRIBUTE}="on"] [${PRIMARY_ATTRIBUTE}="on"] {
  position: relative !important;
  z-index: 1 !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${SECONDARY_ATTRIBUTE}="on"] {
  opacity: 0.48 !important;
  filter: saturate(0.72) !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${HIGHLIGHT_ATTRIBUTE}="on"] {
  outline: 4px solid #1f7650 !important;
  outline-offset: 5px !important;
  border-radius: 6px !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${COLLAPSED_ATTRIBUTE}="on"] {
  display: none !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] {
  box-sizing: border-box !important;
  color: #17231b !important;
  background: #f2f7f1 !important;
  border: 1px solid #b8cabe !important;
  border-radius: 14px !important;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  line-height: 1.5 !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}="summary"] {
  display: grid !important;
  gap: 10px !important;
  margin: 16px auto 22px !important;
  padding: 18px 20px !important;
  max-inline-size: 72ch !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] h2,
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] p,
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] ol,
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] dl {
  margin: 0 !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] h2 {
  font-size: 1.25rem !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] dl {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
  gap: 8px !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] dl div {
  padding: 9px 11px !important;
  border-radius: 9px !important;
  background: #ffffff !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] dt {
  font-size: 0.78rem !important;
  font-weight: 700 !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] dd {
  margin: 2px 0 0 !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}] button {
  min-block-size: 44px !important;
  padding: 8px 13px !important;
  border: 1px solid #8eaa98 !important;
  border-radius: 10px !important;
  color: #17462f !important;
  background: #ffffff !important;
  font: inherit !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}="simplification"] {
  display: grid !important;
  gap: 5px !important;
  margin-block: 10px !important;
  padding: 13px 15px !important;
}
html[${ROOT_ATTRIBUTE}="on"] [${OWNED_ATTRIBUTE}="restore"] {
  display: block !important;
  inline-size: fit-content !important;
  margin-block: 8px !important;
}
`.trim();
}

export interface PageAdaptationRuntime {
  handleCommand: (command: AdaptationCommand) => AdaptationEvent;
  stop: () => void;
}

export function createPageAdaptationRuntime(): PageAdaptationRuntime {
  let session: PresentationSession | null = null;

  function rememberAttribute(element: Element, name: string): void {
    if (
      session?.attributes.some(
        (record) => record.element === element && record.name === name,
      )
    ) {
      return;
    }
    session?.attributes.push({
      element,
      name,
      value: element.getAttribute(name),
    });
  }

  function restore(): number {
    if (session === null) return 0;
    const changedTargetCount = session.attributes.length;
    document.querySelector(`style[${STYLE_ATTRIBUTE}]`)?.remove();
    document.querySelector(`style[${SEMANTIC_STYLE_ATTRIBUTE}]`)?.remove();
    for (const node of session.generatedNodes) node.remove();
    session.generatedNodes = [];
    for (const record of session.attributes) {
      if (record.value === null) record.element.removeAttribute(record.name);
      else record.element.setAttribute(record.name, record.value);
    }
    session.attributes = [];
    return changedTargetCount;
  }

  function own<T extends HTMLElement>(node: T, kind: string): T {
    node.setAttribute(OWNED_ATTRIBUTE, kind);
    session?.generatedNodes.push(node);
    return node;
  }

  function applySemantic(plan: SemanticPlan): void {
    if (session === null) return;
    const root = document.documentElement;
    const style = document.createElement('style');
    style.setAttribute(SEMANTIC_STYLE_ATTRIBUTE, '');
    style.textContent = semanticStyles();
    (document.head ?? root).append(style);

    const primaryElements = plan.primaryTargetIds
      .map(findAuraTarget)
      .filter((target): target is HTMLElement => target !== null);
    for (const target of primaryElements) {
      rememberAttribute(target, PRIMARY_ATTRIBUTE);
      target.setAttribute(PRIMARY_ATTRIBUTE, 'on');
    }
    for (const auraId of plan.deemphasizeTargetIds) {
      const target = findAuraTarget(auraId);
      if (
        target === null ||
        primaryElements.some(
          (item) => target.contains(item) || item.contains(target),
        )
      ) {
        continue;
      }
      rememberAttribute(target, SECONDARY_ATTRIBUTE);
      target.setAttribute(SECONDARY_ATTRIBUTE, 'on');
    }
    for (const target of chooseNonOverlappingHighlights(
      plan.highlightTargetIds,
    )) {
      rememberAttribute(target, HIGHLIGHT_ATTRIBUTE);
      target.setAttribute(HIGHLIGHT_ATTRIBUTE, 'on');
    }
    for (const auraId of plan.collapseTargetIds) {
      const target = findAuraTarget(auraId);
      const active = document.activeElement;
      const locallySafe =
        target !== null &&
        (target.matches('aside, footer, [role="complementary"], [role="contentinfo"]')) &&
        !target.matches('main, article, form, dialog, [role="main"], [role="dialog"]') &&
        target.querySelector(
          'main, article, form, dialog, [role="main"], [role="dialog"], [role="alert"], [aria-live="assertive"]',
        ) === null &&
        !(active instanceof Element && target.contains(active)) &&
        !primaryElements.some(
          (item) => target.contains(item) || item.contains(target),
        );
      if (!locallySafe || target === null || target.parentElement === null) continue;
      rememberAttribute(target, COLLAPSED_ATTRIBUTE);
      target.setAttribute(COLLAPSED_ATTRIBUTE, 'on');
      const button = own(document.createElement('button'), 'restore');
      button.type = 'button';
      const label =
        target.getAttribute('aria-label')?.trim() ||
        target.querySelector('h2, h3')?.textContent?.trim() ||
        'secondary content';
      const updateLabel = (): void => {
        button.textContent =
          target.getAttribute(COLLAPSED_ATTRIBUTE) === 'on'
            ? `Show ${label}`
            : `Hide ${label}`;
      };
      button.addEventListener('click', () => {
        target.setAttribute(
          COLLAPSED_ATTRIBUTE,
          target.getAttribute(COLLAPSED_ATTRIBUTE) === 'on' ? 'off' : 'on',
        );
        updateLabel();
      });
      updateLabel();
      target.before(button);
    }
    for (const item of plan.simplifications) {
      const target = findAuraTarget(item.auraId);
      if (
        target === null ||
        target.parentElement === null ||
        target.textContent === null ||
        target.textContent.trim().length < 60 ||
        target.querySelector('a, button, input, select, textarea') !== null
      ) {
        continue;
      }
      const explanation = own(document.createElement('aside'), 'simplification');
      explanation.setAttribute('aria-label', 'Simpler explanation from AURA');
      const label = document.createElement('strong');
      label.textContent = 'Simpler explanation';
      const copy = document.createElement('p');
      copy.textContent = item.simplifiedText;
      explanation.append(label, copy);
      target.after(explanation);
    }

    const host =
      document.querySelector<HTMLElement>('main, [role="main"], article') ??
      document.body;
    if (host !== null) {
      const summary = own(document.createElement('aside'), 'summary');
      summary.setAttribute('aria-label', 'AURA page summary');
      const heading = document.createElement('h2');
      heading.textContent = plan.pagePurpose;
      const copy = document.createElement('p');
      copy.textContent = plan.summary;
      summary.append(heading, copy);
      if (plan.importantFacts.length > 0) {
        const facts = document.createElement('dl');
        for (const fact of plan.importantFacts) {
          const wrapper = document.createElement('div');
          const label = document.createElement('dt');
          const value = document.createElement('dd');
          label.textContent = fact.label;
          value.textContent = fact.value;
          wrapper.append(label, value);
          facts.append(wrapper);
        }
        summary.append(facts);
      }
      if (plan.guide !== null) {
        const guideHeading = document.createElement('strong');
        guideHeading.textContent = plan.guide.title;
        const steps = document.createElement('ol');
        for (const step of plan.guide.steps) {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = step.instruction;
          button.addEventListener('click', () => {
            const target = findAuraTarget(step.auraId);
            target?.scrollIntoView({
              behavior: session?.settings.reduceMotion ? 'auto' : 'smooth',
              block: 'center',
            });
          });
          item.append(button);
          steps.append(item);
        }
        summary.append(guideHeading, steps);
      }
      host.prepend(summary);
    }
  }

  function apply(): number {
    if (session === null || document.documentElement === null) return 0;
    restore();
    const root = document.documentElement;
    rememberAttribute(root, ROOT_ATTRIBUTE);
    root.setAttribute(ROOT_ATTRIBUTE, 'on');

    let style = document.querySelector<HTMLStyleElement>(
      `style[${STYLE_ATTRIBUTE}]`,
    );
    if (style === null) {
      style = document.createElement('style');
      style.setAttribute(STYLE_ATTRIBUTE, '');
      (document.head ?? root).append(style);
    }
    const rootFontSize =
      Number.parseFloat(window.getComputedStyle(root).fontSize) || 16;
    style.textContent = buildStyles(session.settings, rootFontSize);

    if (session.settings.readingWidth === 'narrow') {
      const readingRegion = chooseReadingRegion();
      if (readingRegion !== null) {
        rememberAttribute(readingRegion, READING_ATTRIBUTE);
        readingRegion.setAttribute(READING_ATTRIBUTE, 'on');
      }
    }
    if (session.semanticPlan !== null) applySemantic(session.semanticPlan);
    return session.attributes.length + session.generatedNodes.length;
  }

  function handleCommand(command: AdaptationCommand): AdaptationEvent {
    try {
      if (command.type === 'apply-presentation') {
        if (session !== null) restore();
        session = {
          attributes: [],
          generatedNodes: [],
          pageId: command.pageId,
          semanticPlan: null,
          settings: command.settings,
          view: 'aura',
        };
        return {
          changedTargetCount: apply(),
          error: null,
          operation: 'presentation',
          pageId: command.pageId,
          status: 'applied',
          view: 'aura',
        };
      }
      if (command.type === 'apply-semantic') {
        if (
          session === null ||
          session.pageId !== command.pageId ||
          command.plan.pageId !== command.pageId
        ) {
          throw new Error('The AURA presentation session is no longer current.');
        }
        session.semanticPlan = command.plan;
        return {
          changedTargetCount: session.view === 'aura' ? apply() : 0,
          error: null,
          operation: 'semantic',
          pageId: command.pageId,
          status: 'applied',
          view: session.view,
        };
      }
      if (session === null || session.pageId !== command.pageId) {
        throw new Error('The AURA presentation session is no longer current.');
      }
      const changedTargetCount =
        command.view === 'original' ? restore() : apply();
      session.view = command.view;
      return {
        changedTargetCount,
        error: null,
        operation: 'view',
        pageId: command.pageId,
        status: command.view === 'original' ? 'restored' : 'applied',
        view: command.view,
      };
    } catch (error) {
      return {
        changedTargetCount: 0,
        error:
          error instanceof Error
            ? error.message
            : 'The page could not be adapted.',
        operation:
          command.type === 'apply-presentation'
            ? 'presentation'
            : command.type === 'apply-semantic'
              ? 'semantic'
              : 'view',
        pageId: command.pageId,
        status: 'failed',
        view: command.type === 'set-adaptation-view' ? command.view : 'original',
      };
    }
  }

  function stop(): void {
    restore();
    session = null;
  }

  return { handleCommand, stop };
}
