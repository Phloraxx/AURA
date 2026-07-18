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
