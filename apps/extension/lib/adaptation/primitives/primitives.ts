import type { AdaptationInstruction } from '@aura/shared';

import type { ElementRegistry } from '../../page/element-registry';

export interface AdaptationPrimitive {
  apply(): void;
  revert(): void;
}

export interface PrimitiveContext {
  document: Document;
  instruction: AdaptationInstruction;
  registry: ElementRegistry;
}

function numericParam(
  instruction: AdaptationInstruction,
  name: string,
  fallback: number,
): number {
  const value = instruction.params?.[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stylePrimitive(
  document: Document,
  instructionId: string,
  css: string,
): AdaptationPrimitive {
  const style = document.createElement('style');
  style.dataset.auraOwned = 'true';
  style.dataset.auraInstruction = instructionId;
  style.textContent = css;

  return {
    apply() {
      if (!style.isConnected) (document.head ?? document.documentElement).append(style);
    },
    revert() {
      style.remove();
    },
  };
}

export function increaseTextScale({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  const scale = Math.min(2, Math.max(1, numericParam(instruction, 'scale', 1.2)));
  return stylePrimitive(
    document,
    instruction.id,
    `html[data-aura-active] :where(p, li, dd, dt, label, button, input, select, textarea, td, th) { font-size: calc(1em * ${scale}) !important; }`,
  );
}

export function increaseLineSpacing({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  const spacing = Math.min(
    2.5,
    Math.max(1, numericParam(instruction, 'spacing', 1.4)),
  );
  return stylePrimitive(
    document,
    instruction.id,
    `html[data-aura-active] :where(p, li, dd, dt, blockquote) { line-height: ${spacing} !important; } html[data-aura-active] :where(p, ul, ol, blockquote) { margin-block: calc(0.75rem * ${spacing}) !important; }`,
  );
}

export function improveContrast({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  return stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] body { color: #111 !important; background-color: #fff !important; } html[data-aura-active] :where(main, article, section, aside, nav) { border-color: #333 !important; } html[data-aura-active] a { color: #003f9e !important; text-decoration-thickness: 0.14em !important; }',
  );
}

export function reduceMotion({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  return stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] *, html[data-aura-active] *::before, html[data-aura-active] *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }',
  );
}

export function enlargeTargets({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  const targetSize = Math.min(
    72,
    Math.max(32, numericParam(instruction, 'targetSizePx', 48)),
  );
  return stylePrimitive(
    document,
    instruction.id,
    `html[data-aura-active] :where(button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], a[href]) { min-inline-size: ${targetSize}px !important; min-block-size: ${targetSize}px !important; padding: max(0.45rem, 0.25em) max(0.65rem, 0.45em) !important; }`,
  );
}

export function enhanceFocusIndicators({
  document,
  instruction,
}: PrimitiveContext): AdaptationPrimitive {
  return stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] :focus-visible { outline: 4px solid #005fcc !important; outline-offset: 3px !important; box-shadow: 0 0 0 2px #fff !important; }',
  );
}

function resolveTargets({
  document,
  instruction,
  registry,
}: PrimitiveContext): Element[] {
  const registered = (instruction.targetIds ?? [])
    .map((id) => registry.getElement(id))
    .filter((element): element is Element => element !== undefined);
  return registered.length > 0
    ? registered
    : Array.from(document.querySelectorAll('main, [role="main"], article')).slice(0, 3);
}

function restoreAttribute(
  element: Element,
  name: string,
  original: string | null,
): void {
  if (original === null) element.removeAttribute(name);
  else element.setAttribute(name, original);
}

export function limitReadingWidth(context: PrimitiveContext): AdaptationPrimitive {
  const { document, instruction } = context;
  const width = instruction.params?.width;
  const widthMode = width === 'very_narrow' ? 'very_narrow' : 'narrow';
  const maxWidth = widthMode === 'very_narrow' ? '52ch' : '68ch';
  const originals = new Map<Element, string | null>();
  const style = stylePrimitive(
    document,
    instruction.id,
    `html[data-aura-active] [data-aura-reading-width] { box-sizing: border-box !important; inline-size: min(100%, ${maxWidth}) !important; margin-inline: auto !important; }`,
  );

  return {
    apply() {
      style.apply();
      for (const target of resolveTargets(context)) {
        if (!originals.has(target)) {
          originals.set(target, target.getAttribute('data-aura-reading-width'));
        }
        target.setAttribute('data-aura-reading-width', widthMode);
      }
    },
    revert() {
      for (const [element, original] of originals) {
        restoreAttribute(element, 'data-aura-reading-width', original);
      }
      originals.clear();
      style.revert();
    },
  };
}

export function focusMainContent(context: PrimitiveContext): AdaptationPrimitive {
  const { document, instruction } = context;
  const mainOriginals = new Map<Element, string | null>();
  const secondaryOriginals = new Map<Element, string | null>();
  const controls: HTMLButtonElement[] = [];
  const style = stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] [data-aura-primary-content] { position: relative !important; z-index: 1 !important; } html[data-aura-active] [data-aura-secondary="collapsed"] { display: none !important; } html[data-aura-active] [data-aura-focus-control] { display: block !important; margin: 0.75rem auto !important; min-height: 44px !important; padding: 0.6rem 0.9rem !important; border: 2px solid #315a3e !important; border-radius: 0.45rem !important; color: #173622 !important; background: #fff !important; font: 700 1rem/1.3 system-ui, sans-serif !important; }',
  );

  return {
    apply() {
      style.apply();
      const mains = resolveTargets(context);
      for (const main of mains) {
        if (!mainOriginals.has(main)) {
          mainOriginals.set(main, main.getAttribute('data-aura-primary-content'));
        }
        main.setAttribute('data-aura-primary-content', 'true');
      }

      const secondaries = Array.from(
        document.querySelectorAll('aside, [role="complementary"]'),
      ).filter((element) => !mains.some((main) => element.contains(main)));

      for (const secondary of secondaries) {
        if (secondaryOriginals.has(secondary)) continue;
        secondaryOriginals.set(secondary, secondary.getAttribute('data-aura-secondary'));
        secondary.setAttribute('data-aura-secondary', 'collapsed');

        const control = document.createElement('button');
        control.type = 'button';
        control.dataset.auraOwned = 'true';
        control.dataset.auraFocusControl = 'true';
        control.setAttribute('aria-expanded', 'false');
        control.textContent = 'Show secondary content';
        control.addEventListener('click', () => {
          const collapsed = secondary.getAttribute('data-aura-secondary') === 'collapsed';
          secondary.setAttribute('data-aura-secondary', collapsed ? 'shown' : 'collapsed');
          control.setAttribute('aria-expanded', String(collapsed));
          control.textContent = collapsed
            ? 'Hide secondary content'
            : 'Show secondary content';
        });
        secondary.before(control);
        controls.push(control);
      }
    },
    revert() {
      controls.splice(0).forEach((control) => control.remove());
      for (const [element, original] of mainOriginals) {
        restoreAttribute(element, 'data-aura-primary-content', original);
      }
      for (const [element, original] of secondaryOriginals) {
        restoreAttribute(element, 'data-aura-secondary', original);
      }
      mainOriginals.clear();
      secondaryOriginals.clear();
      style.revert();
    },
  };
}

function registeredTargets({ instruction, registry }: PrimitiveContext): Element[] {
  return (instruction.targetIds ?? [])
    .map((id) => registry.getElement(id))
    .filter((element): element is Element => element !== undefined);
}

const CRITICAL_CONTENT_PATTERN =
  /\b(pay|payment|purchase|checkout|sign[ -]?in|log[ -]?in|password|security|warning|error|required|consent|agree|legal|terms|privacy|medical|financial)\b/iu;

function isSafetyCritical(element: Element): boolean {
  if (
    element.matches(
      '[required], [aria-invalid="true"], [role="alert"], input[type="password"]',
    ) ||
    element.querySelector(
      '[required], [aria-invalid="true"], [role="alert"], input[type="password"]',
    )
  ) {
    return true;
  }
  return CRITICAL_CONTENT_PATTERN.test(
    (element.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 600),
  );
}

export function collapseDistractions(context: PrimitiveContext): AdaptationPrimitive {
  const { document, instruction } = context;
  const originals = new Map<Element, string | null>();
  const controls = new Map<Element, HTMLButtonElement>();
  const style = stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] [data-aura-distraction="collapsed"] { display: none !important; } html[data-aura-active] [data-aura-distraction-control] { display: block !important; min-height: 44px !important; margin: 0.5rem 0 !important; padding: 0.55rem 0.8rem !important; border: 2px solid #315a3e !important; border-radius: 0.45rem !important; color: #173622 !important; background: #fff !important; font: 700 1rem/1.3 system-ui, sans-serif !important; }',
  );

  return {
    apply() {
      style.apply();
      for (const target of registeredTargets(context)) {
        if (originals.has(target) || isSafetyCritical(target)) continue;
        originals.set(target, target.getAttribute('data-aura-distraction'));
        target.setAttribute('data-aura-distraction', 'collapsed');
        const control = document.createElement('button');
        control.type = 'button';
        control.dataset.auraOwned = 'true';
        control.dataset.auraDistractionControl = 'true';
        control.setAttribute('aria-expanded', 'false');
        control.textContent = 'Show secondary content';
        control.addEventListener('click', () => {
          const collapsed = target.getAttribute('data-aura-distraction') === 'collapsed';
          target.setAttribute('data-aura-distraction', collapsed ? 'shown' : 'collapsed');
          control.setAttribute('aria-expanded', String(collapsed));
          control.textContent = collapsed ? 'Hide secondary content' : 'Show secondary content';
        });
        target.before(control);
        controls.set(target, control);
      }
    },
    revert() {
      controls.forEach((control) => control.remove());
      controls.clear();
      for (const [target, original] of originals) {
        restoreAttribute(target, 'data-aura-distraction', original);
      }
      originals.clear();
      style.revert();
    },
  };
}

export function highlightPrimaryAction(context: PrimitiveContext): AdaptationPrimitive {
  const { document, instruction } = context;
  const originals = new Map<Element, string | null>();
  const style = stylePrimitive(
    document,
    instruction.id,
    'html[data-aura-active] [data-aura-primary-action] { position: relative !important; outline: 4px solid #9b4d00 !important; outline-offset: 4px !important; box-shadow: 0 0 0 2px #fff, 0 0 0 6px #9b4d00 !important; }',
  );
  return {
    apply() {
      style.apply();
      for (const target of registeredTargets(context)) {
        if (!originals.has(target)) {
          originals.set(target, target.getAttribute('data-aura-primary-action'));
        }
        target.setAttribute('data-aura-primary-action', 'true');
      }
    },
    revert() {
      for (const [target, original] of originals) {
        restoreAttribute(target, 'data-aura-primary-action', original);
      }
      originals.clear();
      style.revert();
    },
  };
}

function hasAccessibleName(element: Element): boolean {
  if (
    element.getAttribute('aria-label')?.trim() ||
    element.getAttribute('title')?.trim() ||
    element.getAttribute('alt')?.trim() ||
    (element.textContent ?? '').trim()
  ) {
    return true;
  }
  return element instanceof HTMLInputElement && (element.labels?.length ?? 0) > 0;
}

export function clarifyAmbiguousControls(context: PrimitiveContext): AdaptationPrimitive {
  const label = context.instruction.params?.suggestedLabel;
  const originals = new Map<Element, string | null>();
  return {
    apply() {
      if (typeof label !== 'string' || !label.trim() || label.length > 120) return;
      for (const target of registeredTargets(context)) {
        if (originals.has(target) || hasAccessibleName(target) || isSafetyCritical(target)) {
          continue;
        }
        originals.set(target, target.getAttribute('aria-label'));
        target.setAttribute('aria-label', label.trim());
      }
    },
    revert() {
      for (const [target, original] of originals) {
        restoreAttribute(target, 'aria-label', original);
      }
      originals.clear();
    },
  };
}

interface SimplifiedRecord {
  originalNodes: Node[];
  control: HTMLButtonElement;
  originalMarker: string | null;
  showingOriginal: boolean;
}

export function simplifyText(context: PrimitiveContext): AdaptationPrimitive {
  const { document, instruction } = context;
  const value = instruction.params?.simplifiedText;
  const records = new Map<Element, SimplifiedRecord>();
  const style = stylePrimitive(
    document,
    `${instruction.id}:control`,
    'html[data-aura-active] [data-aura-simplify-control] { display: inline-block !important; min-height: 44px !important; margin: 0.5rem 0 !important; padding: 0.55rem 0.8rem !important; border: 2px solid #315a3e !important; border-radius: 0.45rem !important; color: #173622 !important; background: #fff !important; font: 700 1rem/1.3 system-ui, sans-serif !important; }',
  );
  return {
    apply() {
      if (typeof value !== 'string' || !value.trim() || value.length > 4_000) return;
      style.apply();
      for (const target of registeredTargets(context)) {
        if (
          records.has(target) ||
          target.children.length > 0 ||
          isSafetyCritical(target) ||
          (target.textContent ?? '').trim() === value.trim()
        ) {
          continue;
        }
        const originalNodes = Array.from(target.childNodes);
        const control = document.createElement('button');
        const record: SimplifiedRecord = {
          originalNodes,
          control,
          originalMarker: target.getAttribute('data-aura-simplified'),
          showingOriginal: false,
        };
        control.type = 'button';
        control.dataset.auraOwned = 'true';
        control.dataset.auraSimplifyControl = 'true';
        control.textContent = 'Show original wording';
        control.addEventListener('click', () => {
          record.showingOriginal = !record.showingOriginal;
          target.replaceChildren(
            ...(record.showingOriginal ? record.originalNodes : [document.createTextNode(value)]),
          );
          control.textContent = record.showingOriginal
            ? 'Show simpler wording'
            : 'Show original wording';
          control.setAttribute('aria-pressed', String(record.showingOriginal));
        });
        control.setAttribute('aria-pressed', 'false');
        target.replaceChildren(document.createTextNode(value.trim()));
        target.setAttribute('data-aura-simplified', 'true');
        target.after(control);
        records.set(target, record);
      }
    },
    revert() {
      for (const [target, record] of records) {
        target.replaceChildren(...record.originalNodes);
        restoreAttribute(target, 'data-aura-simplified', record.originalMarker);
        record.control.remove();
      }
      records.clear();
      style.revert();
    },
  };
}

export const deterministicPrimitiveFactories = {
  increaseTextScale,
  increaseLineSpacing,
  limitReadingWidth,
  improveContrast,
  reduceMotion,
  enlargeTargets,
  enhanceFocusIndicators,
  focusMainContent,
} as const;

export const semanticPrimitiveFactories = {
  collapseDistractions,
  highlightPrimaryAction,
  clarifyAmbiguousControls,
  simplifyText,
} as const;
