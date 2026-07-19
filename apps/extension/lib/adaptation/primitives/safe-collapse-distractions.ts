import type { AdaptationPrimitive, PrimitiveContext } from './primitives';

const PRIMARY_CONTENT_SELECTOR = 'main, [role="main"], article';
const CRITICAL_CONTENT_PATTERN =
  /\b(pay|payment|purchase|checkout|sign[ -]?in|log[ -]?in|password|security|warning|error|required|consent|agree|legal|terms|privacy|medical|financial)\b/iu;

function restoreAttribute(element: Element, name: string, original: string | null): void {
  if (original === null) element.removeAttribute(name);
  else element.setAttribute(name, original);
}

function isSafetyCritical(element: Element): boolean {
  if (
    element.matches('[required], [aria-invalid="true"], [role="alert"], input[type="password"]') ||
    element.querySelector('[required], [aria-invalid="true"], [role="alert"], input[type="password"]')
  ) {
    return true;
  }
  return CRITICAL_CONTENT_PATTERN.test(
    (element.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 600),
  );
}

function overlapsPrimaryContent(element: Element): boolean {
  return Boolean(
    element.matches(PRIMARY_CONTENT_SELECTOR) ||
      element.closest(PRIMARY_CONTENT_SELECTOR) ||
      element.querySelector(PRIMARY_CONTENT_SELECTOR),
  );
}

export function safeCollapseDistractions({
  document,
  instruction,
  registry,
}: PrimitiveContext): AdaptationPrimitive {
  const originals = new Map<Element, string | null>();
  const controls = new Map<Element, HTMLButtonElement>();
  const style = document.createElement('style');
  style.dataset.auraOwned = 'true';
  style.dataset.auraInstruction = instruction.id;
  style.textContent =
    'html[data-aura-active] [data-aura-distraction="collapsed"] { display: none !important; } html[data-aura-active] [data-aura-distraction-control] { display: block !important; align-self: start !important; justify-self: start !important; block-size: fit-content !important; inline-size: fit-content !important; max-inline-size: 100% !important; min-height: 44px !important; margin: 0.5rem 0 !important; padding: 0.55rem 0.8rem !important; border: 2px solid #315a3e !important; border-radius: 0.45rem !important; color: #173622 !important; background: #fff !important; font: 700 1rem/1.3 system-ui, sans-serif !important; }';

  const targets = (instruction.targetIds ?? [])
    .map((id) => registry.getElement(id))
    .filter((element): element is Element => element !== undefined);

  return {
    apply() {
      if (!style.isConnected) (document.head ?? document.documentElement).append(style);
      for (const target of targets) {
        if (
          originals.has(target) ||
          target.closest('[data-aura-owned]') ||
          target.hasAttribute('data-aura-secondary') ||
          isSafetyCritical(target) ||
          overlapsPrimaryContent(target)
        ) {
          continue;
        }

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
      style.remove();
    },
  };
}
