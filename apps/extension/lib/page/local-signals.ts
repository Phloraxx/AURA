import type { LocalPageSignals } from '@aura/shared';

import type { ElementRegistry } from './element-registry';

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

function isLocallyVisible(element: Element): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  if (element instanceof HTMLElement) {
    return element.style.display !== 'none' && element.style.visibility !== 'hidden';
  }
  return true;
}

export function extractLocalPageSignals(
  document: Document,
  registry: ElementRegistry,
): LocalPageSignals {
  registry.registerSubtree(document);
  const mainCandidates = Array.from(
    document.querySelectorAll('main, [role="main"], article'),
  ).filter(isLocallyVisible);

  return {
    mainContentIds: mainCandidates
      .map((element) => registry.getId(element) ?? registry.register(element))
      .slice(0, 10),
    interactiveElementCount: Array.from(
      document.querySelectorAll(INTERACTIVE_SELECTOR),
    ).filter(isLocallyVisible).length,
    visibleTextLength: (document.body?.innerText ?? document.body?.textContent ?? '')
      .trim()
      .slice(0, 100_000).length,
    hasArticleLandmark: document.querySelector('article') !== null,
    hasMainLandmark: document.querySelector('main, [role="main"]') !== null,
  };
}
