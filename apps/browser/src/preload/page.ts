import { ipcRenderer } from 'electron';

import { createPageAdaptationRuntime } from '../page-adaptation/runtime';
import { createPageIntelligenceRuntime } from '../page-intelligence/runtime';
import {
  buildPageRecomposePlan,
  inferPresetFromSettings,
  refinePageRecomposeWithSemantic,
} from '../page-recompose/plan';
import { createPageRecomposeRuntime } from '../page-recompose/runtime';
import {
  adaptationCommandSchema,
  type AdaptationCommand,
  type AdaptationEvent,
} from '../shared/adaptation';
import {
  pageRuntimeCommandSchema,
  type PageModel,
  type PageRuntimeCommand,
} from '../shared/page-model';
import type { RecomposePlan } from '../shared/recompose';

type PageRuntimePhase = 'dom-ready' | 'preload-started';

interface PageRuntimeEvent {
  phase: PageRuntimePhase;
  readyState: DocumentReadyState;
  title: string;
  url: string;
}

const PAGE_RUNTIME_CHANNEL = 'aura:page-runtime:event';
const PAGE_MODEL_CHANNEL = 'aura:page-intelligence:model';
const PAGE_COMMAND_CHANNEL = 'aura:page-runtime:command';
const ADAPTATION_COMMAND_CHANNEL = 'aura:adaptation:command';
const ADAPTATION_EVENT_CHANNEL = 'aura:adaptation:event';
const AURA_EVENT_THEME_ATTRIBUTE = 'data-aura-event-theme';

/** Keep AURA-owned page surfaces aligned with the event identity. */
function installAuraEventTheme(): void {
  if (document.querySelector(`style[${AURA_EVENT_THEME_ATTRIBUTE}]`) !== null) return;
  const host = document.head ?? document.documentElement;
  if (host === null) return;

  const style = document.createElement('style');
  style.setAttribute(AURA_EVENT_THEME_ATTRIBUTE, '');
  style.textContent = `
html[data-aura-presentation="on"] body [data-aura-highlight="on"] {
  outline-color: #8b63ff !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,.88), 0 0 24px rgba(112,92,255,.26) !important;
}
html[data-aura-presentation="on"] body [data-aura-guide-active="on"] {
  outline-color: #73c9ff !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 0 26px rgba(91,140,255,.28) !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] {
  box-sizing: border-box !important;
  border: 1px solid rgba(190,169,255,.3) !important;
  border-radius: 16px !important;
  color: #f7f4ff !important;
  background: linear-gradient(145deg, rgba(128,88,255,.13), rgba(66,109,227,.06)), #100e19 !important;
  box-shadow: 0 16px 46px rgba(4,3,10,.26), inset 0 1px 0 rgba(255,255,255,.055) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] h2,
html[data-aura-presentation="on"] body [data-aura-owned] strong { color: #f8f5ff !important; }
html[data-aura-presentation="on"] body [data-aura-owned] p,
html[data-aura-presentation="on"] body [data-aura-owned] dd { color: #d0c9dd !important; }
html[data-aura-presentation="on"] body [data-aura-owned] dt,
html[data-aura-presentation="on"] body [data-aura-owned="guide-status"] { color: #aaa0c1 !important; }
html[data-aura-presentation="on"] body [data-aura-owned] dl div {
  border: 1px solid rgba(182,163,255,.14) !important;
  color: #f7f4ff !important;
  background: #171322 !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] button {
  border: 1px solid rgba(184,161,255,.34) !important;
  border-radius: 11px !important;
  color: #eee9ff !important;
  background: #171322 !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04) !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] button:hover {
  border-color: rgba(176,143,255,.62) !important;
  color: #ffffff !important;
  background: #201933 !important;
}
html[data-aura-presentation="on"] body [data-aura-owned="summary"] ol button[aria-current="step"] {
  border-color: #73c9ff !important;
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(126,82,232,.38), rgba(75,111,215,.3)), #171322 !important;
  box-shadow: 0 0 0 2px rgba(115,201,255,.13), 0 0 20px rgba(105,105,255,.14) !important;
}
html[data-aura-presentation="on"] body [data-aura-owned="simplification"] { border-left: 3px solid #8b63ff !important; }
html[data-aura-presentation="on"] body [data-aura-owned="restore"] {
  color: #eee9ff !important;
  background: #100e19 !important;
}
`.trim();
  host.append(style);
}

function report(phase: PageRuntimePhase): void {
  ipcRenderer.send(PAGE_RUNTIME_CHANNEL, {
    phase,
    readyState: document.readyState,
    title: document.title,
    url: window.location.href,
  } satisfies PageRuntimeEvent);
}

function combineEvents(
  pageId: string,
  view: 'aura' | 'original',
  operation: AdaptationEvent['operation'],
  events: AdaptationEvent[],
): AdaptationEvent {
  const failed = events.find((event) => event.status === 'failed');
  return {
    changedTargetCount: events.reduce((total, event) => total + event.changedTargetCount, 0),
    error: failed?.error ?? null,
    operation,
    pageId,
    status: failed ? 'failed' : view === 'original' ? 'restored' : 'applied',
    view,
  };
}

function sourceRank(source: RecomposePlan['source']): number {
  if (source === 'cloud') return 2;
  if (source === 'local') return 1;
  return 0;
}

let currentPageId: string | null = null;
let currentRevision: number | null = null;
let currentPageModel: PageModel | null = null;
let currentReduceMotion = false;
let currentRecomposePlan: RecomposePlan | null = null;
const intelligenceRuntime = createPageIntelligenceRuntime((model) => {
  currentPageId = model.pageId;
  currentRevision = model.revision;
  currentPageModel = model;
  ipcRenderer.send(PAGE_MODEL_CHANNEL, model);
});
const adaptationRuntime = createPageAdaptationRuntime();
const recomposeRuntime = createPageRecomposeRuntime();

ipcRenderer.on(PAGE_COMMAND_CHANNEL, (_event, untrustedCommand: PageRuntimeCommand) => {
  const command = pageRuntimeCommandSchema.safeParse(untrustedCommand);
  if (command.success) intelligenceRuntime.handleCommand(command.data);
});

ipcRenderer.on(ADAPTATION_COMMAND_CHANNEL, (_event, untrustedCommand: AdaptationCommand) => {
  const parsed = adaptationCommandSchema.safeParse(untrustedCommand);
  if (!parsed.success) return;
  const command = parsed.data;
  const current =
    command.pageId === currentPageId &&
    (command.type === 'set-adaptation-view' || command.revision === currentRevision);
  if (!current) {
    ipcRenderer.send(ADAPTATION_EVENT_CHANNEL, {
      changedTargetCount: 0,
      error: 'The page changed before AURA could apply this presentation.',
      operation:
        command.type === 'apply-presentation' || command.type === 'update-presentation'
          ? 'presentation'
          : command.type === 'apply-semantic'
            ? 'semantic'
            : command.type === 'apply-recompose'
              ? 'recompose'
              : 'view',
      pageId: command.pageId,
      status: 'failed',
      view: command.type === 'set-adaptation-view' ? command.view : 'original',
    });
    return;
  }

  if (command.type === 'apply-recompose') {
    if (
      currentRecomposePlan !== null &&
      sourceRank(command.plan.source) < sourceRank(currentRecomposePlan.source)
    ) {
      ipcRenderer.send(ADAPTATION_EVENT_CHANNEL, {
        changedTargetCount: currentRecomposePlan.sections.reduce(
          (count, section) => count + section.items.length,
          0,
        ),
        error: null,
        operation: 'recompose',
        pageId: command.pageId,
        status: 'applied',
        view: 'aura',
      });
      return;
    }
    currentRecomposePlan = command.plan;
    ipcRenderer.send(
      ADAPTATION_EVENT_CHANNEL,
      recomposeRuntime.applyPlan(command.plan, currentReduceMotion),
    );
    return;
  }

  if (command.type === 'set-adaptation-view') {
    const events = [adaptationRuntime.handleCommand(command)];
    if (currentRecomposePlan !== null) {
      events.push(recomposeRuntime.setView(command.pageId, command.view));
    }
    ipcRenderer.send(
      ADAPTATION_EVENT_CHANNEL,
      combineEvents(command.pageId, command.view, 'view', events),
    );
    return;
  }

  if (command.type === 'apply-presentation' || command.type === 'update-presentation') {
    currentReduceMotion = command.settings.reduceMotion;
    const presentationEvent = adaptationRuntime.handleCommand(command);
    const events = [presentationEvent];
    if (presentationEvent.status !== 'failed' && currentPageModel !== null) {
      const preset = inferPresetFromSettings(command.settings);
      currentRecomposePlan = buildPageRecomposePlan({
        page: currentPageModel,
        preset,
        source: 'deterministic',
        subtitle:
          'AURA is rebuilding this real page while deeper understanding arrives.',
      });
      events.push(recomposeRuntime.applyPlan(currentRecomposePlan, currentReduceMotion));
    }
    ipcRenderer.send(
      ADAPTATION_EVENT_CHANNEL,
      combineEvents(command.pageId, 'aura', 'presentation', events),
    );
    return;
  }

  const semanticEvent = adaptationRuntime.handleCommand(command);
  const events = [semanticEvent];
  if (
    semanticEvent.status !== 'failed' &&
    currentRecomposePlan !== null &&
    currentPageModel !== null
  ) {
    currentRecomposePlan = refinePageRecomposeWithSemantic(
      {
        ...currentRecomposePlan,
        revision: currentPageModel.revision,
      },
      command.plan,
    );
    events.push(recomposeRuntime.applyPlan(currentRecomposePlan, currentReduceMotion));
  }
  ipcRenderer.send(
    ADAPTATION_EVENT_CHANNEL,
    combineEvents(command.pageId, semanticEvent.view, 'semantic', events),
  );
});

window.addEventListener(
  'pagehide',
  () => {
    currentRecomposePlan = null;
    currentPageModel = null;
    recomposeRuntime.stop();
    adaptationRuntime.stop();
    intelligenceRuntime.stop();
  },
  { once: true },
);

installAuraEventTheme();
report('preload-started');
intelligenceRuntime.start();

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      installAuraEventTheme();
      report('dom-ready');
    },
    { once: true },
  );
} else {
  installAuraEventTheme();
  report('dom-ready');
}
