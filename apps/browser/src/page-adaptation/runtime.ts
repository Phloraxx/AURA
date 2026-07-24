import type {
  AdaptationCommand,
  AdaptationEvent,
  PresentationSettings,
} from '../shared/adaptation';

const ROOT_ATTRIBUTE = 'data-aura-presentation';
const READING_ATTRIBUTE = 'data-aura-reading-region';
const STYLE_ATTRIBUTE = 'data-aura-presentation-style';

interface AttributeRecord {
  element: Element;
  name: string;
  value: string | null;
}

interface PresentationSession {
  attributes: AttributeRecord[];
  pageId: string;
  settings: PresentationSettings;
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
    document.querySelector(`style[${STYLE_ATTRIBUTE}]`)?.remove();
    for (const record of session.attributes) {
      if (record.value === null) record.element.removeAttribute(record.name);
      else record.element.setAttribute(record.name, record.value);
    }
    return session.attributes.length;
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
    return session.attributes.length;
  }

  function handleCommand(command: AdaptationCommand): AdaptationEvent {
    try {
      if (command.type === 'apply-presentation') {
        if (session !== null) restore();
        session = {
          attributes: [],
          pageId: command.pageId,
          settings: command.settings,
        };
        return {
          changedTargetCount: apply(),
          error: null,
          pageId: command.pageId,
          status: 'applied',
          view: 'aura',
        };
      }
      if (session === null || session.pageId !== command.pageId) {
        throw new Error('The AURA presentation session is no longer current.');
      }
      const changedTargetCount =
        command.view === 'original' ? restore() : apply();
      return {
        changedTargetCount,
        error: null,
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
