import type { AdaptationPrimitive, PrimitiveContext } from './primitives';

const CRITICAL_CONTENT_PATTERN =
  /\b(pay|payment|purchase|checkout|sign[ -]?in|log[ -]?in|password|security|warning|error|required|consent|agree|legal|terms|privacy|medical|financial)\b/iu;

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

function restoreAttribute(element: Element, name: string, original: string | null): void {
  if (original === null) element.removeAttribute(name);
  else element.setAttribute(name, original);
}

export function safeFocusMainContent({
  document,
  instruction,
  registry,
}: PrimitiveContext): AdaptationPrimitive {
  const mainOriginals = new Map<Element, string | null>();
  const secondaryOriginals = new Map<Element, string | null>();
  const controls: HTMLButtonElement[] = [];
  const style = document.createElement('style');
  style.dataset.auraOwned = 'true';
  style.dataset.auraInstruction = instruction.id;
  style.textContent =
    'html[data-aura-active] [data-aura-primary-content] { position: relative !important; z-index: 1 !important; } html[data-aura-active] [data-aura-secondary="collapsed"] { display: none !important; } html[data-aura-active] [data-aura-focus-control] { display: block !important; margin: 0.75rem auto !important; min-height: 44px !important; padding: 0.6rem 0.9rem !important; border: 2px solid #315a3e !important; border-radius: 0.45rem !important; color: #173622 !important; background: #fff !important; font: 700 1rem/1.3 system-ui, sans-serif !important; }';

  const registered = (instruction.targetIds ?? [])
    .map((id) => registry.getElement(id))
    .filter((element): element is Element => element !== undefined);
  const mains = registered.length > 0
    ? registered
    : Array.from(document.querySelectorAll('main, [role="main"], article')).slice(0, 3);

  return {
    apply() {
      if (!style.isConnected) (document.head ?? document.documentElement).append(style);
      for (const main of mains) {
        if (!mainOriginals.has(main)) {
          mainOriginals.set(main, main.getAttribute('data-aura-primary-content'));
        }
        main.setAttribute('data-aura-primary-content', 'true');
      }

      const secondaries = Array.from(
        document.querySelectorAll('aside, [role="complementary"]'),
      ).filter(
        (element) =>
          !mains.some((main) => element.contains(main)) &&
          !element.closest('[data-aura-owned]') &&
          !isSafetyCritical(element),
      );

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
          control.textContent = collapsed ? 'Hide secondary content' : 'Show secondary content';
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
      style.remove();
    },
  };
}
