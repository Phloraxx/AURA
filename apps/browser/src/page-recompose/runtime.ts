import type { AdaptationEvent } from '../shared/adaptation';
import type { RecomposeAction, RecomposePlan } from '../shared/recompose';

const ROOT_ATTRIBUTE = 'data-aura-recomposed';
const ROOT_NODE_ATTRIBUTE = 'data-aura-recompose-root';
const STYLE_ATTRIBUTE = 'data-aura-recompose-style';

interface RecomposeSession {
  pageId: string;
  plan: RecomposePlan;
  stepIndex: number;
  view: 'aura' | 'original';
}

interface ViewTransitionDocument extends Document {
  startViewTransition: (callback: () => void) => ViewTransition;
}

function findAuraTarget(auraId: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>('[data-aura-id]')].find(
      (element) => element.getAttribute('data-aura-id') === auraId,
    ) ?? null
  );
}

function createText(
  tag: 'h1' | 'h2' | 'h3' | 'p' | 'span',
  text: string,
): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function styles(reduceMotion: boolean): string {
  return `
html[${ROOT_ATTRIBUTE}="on"] body { overflow: hidden !important; }
[${ROOT_NODE_ATTRIBUTE}] {
  --r-bg: #0d0c10;
  --r-surface: #17161b;
  --r-border: rgba(255,255,255,.11);
  --r-text: #f4f2f7;
  --r-muted: #b9b5c0;
  --r-violet: #9176f4;
  --r-cyan: #8bbdf2;
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483600 !important;
  overflow: auto !important;
  box-sizing: border-box !important;
  color: var(--r-text) !important;
  background: var(--r-bg) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif !important;
  line-height: 1.45 !important;
  overscroll-behavior: contain !important;
  transition: opacity 160ms ease !important;
}
[${ROOT_NODE_ATTRIBUTE}] * { box-sizing: border-box !important; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-shell {
  width: min(1040px, calc(100% - 48px));
  margin: 0 auto;
  padding: 34px 0 60px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 28px;
  color: var(--r-muted);
  font-size: 13px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #f8f5ff;
  font-weight: 650;
  letter-spacing: .12em;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-halo {
  width: 21px;
  height: 21px;
  border: 1.5px solid rgba(145,118,244,.88);
  border-right-color: var(--r-cyan);
  border-radius: 50%;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-source {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-source i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--r-cyan);
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-hero { max-width: 760px; margin-bottom: 30px; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-kicker {
  margin: 0 0 9px !important;
  color: #a89bc8 !important;
  font-size: 13px !important;
  font-weight: 650 !important;
  letter-spacing: .01em !important;
  text-transform: none !important;
}
[${ROOT_NODE_ATTRIBUTE}] h1,
[${ROOT_NODE_ATTRIBUTE}] h2,
[${ROOT_NODE_ATTRIBUTE}] h3,
[${ROOT_NODE_ATTRIBUTE}] p { margin: 0 !important; }
[${ROOT_NODE_ATTRIBUTE}] h1 {
  color: #f7f5f9 !important;
  font-size: clamp(30px, 3.3vw, 48px) !important;
  font-weight: 540 !important;
  letter-spacing: -.035em !important;
  line-height: 1.08 !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-subtitle {
  max-width: 720px;
  margin-top: 14px !important;
  color: #c6bed6 !important;
  font-size: 16px !important;
  line-height: 1.55 !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-summary {
  max-width: 720px;
  margin-top: 12px !important;
  color: #9f97b0 !important;
  font-size: 14px !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-grid,
[${ROOT_NODE_ATTRIBUTE}] .aura-r-section { display: grid; gap: 14px; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-section > h2 {
  color: #f4f0ff !important;
  font-size: 15px !important;
  font-weight: 700 !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  gap: 10px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-card {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 116px;
  padding: 16px;
  border: 1px solid var(--r-border);
  border-radius: 12px;
  background: var(--r-surface);
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-card h3 {
  color: #f7f4ff !important;
  font-size: 16px !important;
  line-height: 1.3 !important;
  font-weight: 670 !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-card p {
  color: var(--r-muted) !important;
  font-size: 13px !important;
  line-height: 1.52 !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: #9f96b2;
  font-size: 11px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-meta span {
  padding: 0;
}
[${ROOT_NODE_ATTRIBUTE}] button {
  min-height: 44px !important;
  margin-top: auto !important;
  padding: 10px 13px !important;
  border: 1px solid rgba(255,255,255,.14) !important;
  border-radius: 10px !important;
  color: #eee9ff !important;
  background: #222027 !important;
  font: inherit !important;
  font-size: 13px !important;
  font-weight: 680 !important;
  cursor: pointer !important;
}
[${ROOT_NODE_ATTRIBUTE}] button[data-prominence="primary"] {
  color: #fff !important;
  border-color: #7c64d9 !important;
  background: #7159cd !important;
}
[${ROOT_NODE_ATTRIBUTE}] button:focus-visible {
  outline: 3px solid #79bbff !important;
  outline-offset: 3px !important;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="clear_calm"] .aura-r-shell {
  width: min(820px, calc(100% - 48px));
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="clear_calm"] .aura-r-items,
[${ROOT_NODE_ATTRIBUTE}][data-preset="step_by_step"] .aura-r-items {
  grid-template-columns: 1fr;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easier_to_see"] .aura-r-shell {
  width: min(900px, calc(100% - 56px));
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easier_to_see"] .aura-r-card h3 {
  font-size: 22px !important;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easier_to_see"] .aura-r-card p {
  font-size: 17px !important;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easier_to_see"] button {
  min-height: 60px !important;
  font-size: 17px !important;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easy_to_control"] .aura-r-items {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
  gap: 18px;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="easy_to_control"] .aura-r-card { padding: 22px; }
[${ROOT_NODE_ATTRIBUTE}][data-preset="easy_to_control"] button {
  min-height: 60px !important;
  font-size: 16px !important;
}
[${ROOT_NODE_ATTRIBUTE}][data-preset="step_by_step"] .aura-r-section[hidden] {
  display: none !important;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-step-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  color: #a99fba;
  font-size: 12px;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-step-nav > div { display: flex; gap: 8px; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-step-nav button {
  min-width: 92px;
  margin: 0 !important;
}
${
  reduceMotion
    ? ''
    : `
[${ROOT_NODE_ATTRIBUTE}] .aura-r-hero {
  animation: aura-r-enter 260ms cubic-bezier(.2,.82,.2,1) both;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-section {
  animation: aura-r-enter 300ms cubic-bezier(.2,.82,.2,1) both;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-section:nth-child(2) { animation-delay: 45ms; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-section:nth-child(3) { animation-delay: 90ms; }
[${ROOT_NODE_ATTRIBUTE}] .aura-r-card {
  transition: border-color 150ms ease, background-color 150ms ease;
}
[${ROOT_NODE_ATTRIBUTE}] .aura-r-card:hover {
  border-color: rgba(177,145,255,.3);
  background: #1a181f;
}
@keyframes aura-r-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`
}
@media (prefers-reduced-motion: reduce) {
  [${ROOT_NODE_ATTRIBUTE}] *,
  [${ROOT_NODE_ATTRIBUTE}] *::before,
  [${ROOT_NODE_ATTRIBUTE}] *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
`.trim();
}

export interface PageRecomposeRuntime {
  applyPlan: (
    plan: RecomposePlan,
    reduceMotion: boolean,
    activate?: boolean,
  ) => AdaptationEvent;
  setView: (pageId: string, view: 'aura' | 'original') => AdaptationEvent;
  stop: () => void;
}

export function createPageRecomposeRuntime(
  onEvent: (event: AdaptationEvent) => void = () => undefined,
): PageRecomposeRuntime {
  let session: RecomposeSession | null = null;
  let reduceMotion = false;

  function removeRoot(): void {
    document.querySelector(`[${ROOT_NODE_ATTRIBUTE}]`)?.remove();
    document.querySelector(`style[${STYLE_ATTRIBUTE}]`)?.remove();
    document.documentElement?.removeAttribute(ROOT_ATTRIBUTE);
  }

  function switchToOriginalForTarget(
    target: HTMLElement,
  ): AdaptationEvent | null {
    if (session === null) return null;
    session.view = 'original';
    const event: AdaptationEvent = {
      changedTargetCount: session.plan.sections.reduce(
        (count, section) => count + section.items.length,
        0,
      ),
      error: null,
      operation: 'view',
      pageId: session.pageId,
      status: 'restored',
      view: 'original',
    };
    removeRoot();
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
    onEvent(event);
    return event;
  }

  function revealForScroll(target: HTMLElement): void {
    if (switchToOriginalForTarget(target) === null) return;
    target.setAttribute('data-aura-highlight', 'on');
    window.setTimeout(
      () => {
        target.removeAttribute('data-aura-highlight');
      },
      reduceMotion ? 450 : 900,
    );
  }

  function revealForFocus(target: HTMLElement): void {
    if (switchToOriginalForTarget(target) === null) return;
    target.setAttribute('data-aura-guide-active', 'on');
    target.focus({ preventScroll: true });

    let cleared = false;
    const clearGuide = (): void => {
      if (cleared) return;
      cleared = true;
      target.removeAttribute('data-aura-guide-active');
    };
    target.addEventListener('blur', clearGuide, { once: true });
    window.setTimeout(clearGuide, 12_000);
  }

  function activate(action: RecomposeAction): void {
    const target = findAuraTarget(action.auraId);
    if (target === null) return;
    if (action.behavior === 'click') {
      target.click();
      return;
    }
    if (action.behavior === 'focus') {
      revealForFocus(target);
      return;
    }
    revealForScroll(target);
  }

  function renderCard(
    item: RecomposePlan['sections'][number]['items'][number],
  ): HTMLElement {
    const card = document.createElement('article');
    card.className = 'aura-r-card';
    card.append(createText('h3', item.title));
    if (item.description) card.append(createText('p', item.description));
    if (item.meta.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'aura-r-meta';
      for (const value of item.meta) meta.append(createText('span', value));
      card.append(meta);
    }
    if (item.action !== null) {
      const action = item.action;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.prominence = action.prominence;
      button.textContent = action.label;
      button.addEventListener('click', () => activate(action));
      card.append(button);
    }
    return card;
  }

  function render(plan: RecomposePlan): void {
    const body = document.body;
    const host = document.head ?? document.documentElement;
    if (body === null || host === null) {
      throw new Error('The page is not ready for AURA Recompose.');
    }

    removeRoot();
    const style = document.createElement('style');
    style.setAttribute(STYLE_ATTRIBUTE, '');
    style.textContent = styles(reduceMotion);
    host.append(style);

    const root = document.createElement('section');
    root.setAttribute(ROOT_NODE_ATTRIBUTE, '');
    root.setAttribute('data-aura-intelligence-ignore', '');
    root.setAttribute('data-preset', plan.preset);
    root.setAttribute('aria-label', 'AURA recomposed page');

    const shell = document.createElement('div');
    shell.className = 'aura-r-shell';

    const topline = document.createElement('div');
    topline.className = 'aura-r-topline';
    const brand = document.createElement('span');
    brand.className = 'aura-r-brand';
    const halo = document.createElement('i');
    halo.className = 'aura-r-halo';
    brand.append(halo, createText('span', 'AURA'));
    const source = document.createElement('span');
    source.className = 'aura-r-source';
    const sourceText =
      plan.source === 'cloud'
        ? 'Refined'
        : plan.source === 'local'
          ? 'Personalized'
          : 'Ready';
    source.append(document.createElement('i'), createText('span', sourceText));
    topline.append(brand, source);

    // Use a neutral element so broad website rules such as `header { ... }`
    // cannot leak into AURA's trusted presentation surface.
    const hero = document.createElement('div');
    hero.className = 'aura-r-hero';
    const kicker = createText(
      'p',
      plan.preset === 'personalized'
        ? 'Made for your profile'
        : plan.preset.replaceAll('_', ' '),
    );
    kicker.className = 'aura-r-kicker';
    hero.append(kicker, createText('h1', plan.title));
    if (plan.subtitle) {
      const subtitle = createText('p', plan.subtitle);
      subtitle.className = 'aura-r-subtitle';
      hero.append(subtitle);
    }
    if (plan.summary) {
      const summary = createText('p', plan.summary);
      summary.className = 'aura-r-summary';
      hero.append(summary);
    }

    const grid = document.createElement('div');
    grid.className = 'aura-r-grid';
    const renderedSections: HTMLElement[] = [];
    for (const [sectionIndex, section] of plan.sections.entries()) {
      const sectionNode = document.createElement('section');
      sectionNode.className = 'aura-r-section';
      sectionNode.dataset.sectionIndex = String(sectionIndex);
      sectionNode.append(createText('h2', section.title));
      const items = document.createElement('div');
      items.className = 'aura-r-items';
      for (const item of section.items) items.append(renderCard(item));
      sectionNode.append(items);
      grid.append(sectionNode);
      renderedSections.push(sectionNode);
    }

    shell.append(topline, hero, grid);

    if (plan.preset === 'step_by_step' && renderedSections.length > 0) {
      if (session !== null) {
        session.stepIndex = Math.min(
          session.stepIndex,
          renderedSections.length - 1,
        );
      }
      const nav = document.createElement('div');
      nav.className = 'aura-r-step-nav';
      const status = createText('span', '');
      const controls = document.createElement('div');
      const previous = document.createElement('button');
      const next = document.createElement('button');
      previous.type = 'button';
      next.type = 'button';
      previous.textContent = 'Back';
      next.textContent = 'Next';
      const updateStep = (): void => {
        const index = session?.stepIndex ?? 0;
        renderedSections.forEach((node, nodeIndex) => {
          node.hidden = nodeIndex !== index;
        });
        status.textContent = `Step ${index + 1} of ${renderedSections.length}`;
        previous.disabled = index === 0;
        next.disabled = index >= renderedSections.length - 1;
        root.scrollTo({
          top: 0,
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      };
      previous.addEventListener('click', () => {
        if (session === null) return;
        session.stepIndex = Math.max(0, session.stepIndex - 1);
        updateStep();
      });
      next.addEventListener('click', () => {
        if (session === null) return;
        session.stepIndex = Math.min(
          renderedSections.length - 1,
          session.stepIndex + 1,
        );
        updateStep();
      });
      controls.append(previous, next);
      nav.append(status, controls);
      shell.append(nav);
      updateStep();
    }

    root.append(shell);
    body.append(root);
    document.documentElement.setAttribute(ROOT_ATTRIBUTE, 'on');
  }

  function renderWithTransition(plan: RecomposePlan): void {
    const transitionDocument = document as ViewTransitionDocument;
    if (!reduceMotion) {
      transitionDocument.startViewTransition(() => render(plan));
      return;
    }
    render(plan);
  }

  function applyPlan(
    plan: RecomposePlan,
    nextReduceMotion: boolean,
    activate = true,
  ): AdaptationEvent {
    try {
      reduceMotion = nextReduceMotion;
      if (session === null || session.pageId !== plan.pageId) {
        session = {
          pageId: plan.pageId,
          plan,
          stepIndex: 0,
          view: 'aura',
        };
      } else {
        session.plan = plan;
        if (activate) session.view = 'aura';
      }
      if (session.view === 'aura') renderWithTransition(plan);
      return {
        changedTargetCount: plan.sections.reduce(
          (count, section) => count + section.items.length,
          0,
        ),
        error: null,
        operation: 'recompose',
        pageId: plan.pageId,
        status: 'applied',
        view: session.view,
      };
    } catch (error) {
      return {
        changedTargetCount: 0,
        error:
          error instanceof Error
            ? error.message
            : 'AURA could not recompose this page.',
        operation: 'recompose',
        pageId: plan.pageId,
        status: 'failed',
        view: session?.view ?? 'original',
      };
    }
  }

  function setView(pageId: string, view: 'aura' | 'original'): AdaptationEvent {
    if (session === null || session.pageId !== pageId) {
      return {
        changedTargetCount: 0,
        error: null,
        operation: 'recompose',
        pageId,
        status: view === 'original' ? 'restored' : 'applied',
        view,
      };
    }
    session.view = view;
    if (view === 'original') removeRoot();
    else renderWithTransition(session.plan);
    return {
      changedTargetCount: session.plan.sections.reduce(
        (count, section) => count + section.items.length,
        0,
      ),
      error: null,
      operation: 'recompose',
      pageId,
      status: view === 'original' ? 'restored' : 'applied',
      view,
    };
  }

  function stop(): void {
    removeRoot();
    session = null;
  }

  return { applyPlan, setView, stop };
}
