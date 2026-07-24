import { ipcRenderer } from 'electron';

import { createPageAdaptationRuntime } from '../page-adaptation/runtime';
import { createPageIntelligenceRuntime } from '../page-intelligence/runtime';
import {
  adaptationCommandSchema,
  type AdaptationCommand,
} from '../shared/adaptation';
import {
  pageRuntimeCommandSchema,
  type PageRuntimeCommand,
} from '../shared/page-model';

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

/**
 * AURA-owned companion UI is rendered inside arbitrary websites by the
 * adaptation runtime. Keep it visually consistent with the judged browser's
 * promo-film identity without restyling the host website itself.
 *
 * Selectors intentionally have slightly higher specificity than the runtime's
 * baseline semantic styles. Every declaration remains scoped to AURA-owned or
 * AURA-state attributes, so ordinary page components are untouched.
 */
function installAuraEventTheme(): void {
  if (document.querySelector(`style[${AURA_EVENT_THEME_ATTRIBUTE}]`) !== null) {
    return;
  }

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
html[data-aura-presentation="on"] body [data-aura-owned] strong {
  color: #f8f5ff !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] p,
html[data-aura-presentation="on"] body [data-aura-owned] dd {
  color: #d0c9dd !important;
}
html[data-aura-presentation="on"] body [data-aura-owned] dt,
html[data-aura-presentation="on"] body [data-aura-owned="guide-status"] {
  color: #aaa0c1 !important;
}
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
html[data-aura-presentation="on"] body [data-aura-owned="simplification"] {
  border-left: 3px solid #8b63ff !important;
}
html[data-aura-presentation="on"] body [data-aura-owned="restore"] {
  color: #eee9ff !important;
  background: #100e19 !important;
}
`.trim();

  host.append(style);
}

function report(phase: PageRuntimePhase): void {
  const event: PageRuntimeEvent = {
    phase,
    readyState: document.readyState,
    title: document.title,
    url: window.location.href,
  };
  ipcRenderer.send(PAGE_RUNTIME_CHANNEL, event);
}

let currentPageId: string | null = null;
let currentRevision: number | null = null;
const intelligenceRuntime = createPageIntelligenceRuntime((model) => {
  currentPageId = model.pageId;
  currentRevision = model.revision;
  ipcRenderer.send(PAGE_MODEL_CHANNEL, model);
});
const adaptationRuntime = createPageAdaptationRuntime();

ipcRenderer.on(
  PAGE_COMMAND_CHANNEL,
  (_event, untrustedCommand: PageRuntimeCommand) => {
    const command = pageRuntimeCommandSchema.safeParse(untrustedCommand);
    if (command.success) intelligenceRuntime.handleCommand(command.data);
  },
);

ipcRenderer.on(
  ADAPTATION_COMMAND_CHANNEL,
  (_event, untrustedCommand: AdaptationCommand) => {
    const parsed = adaptationCommandSchema.safeParse(untrustedCommand);
    if (!parsed.success) return;
    const command = parsed.data;
    const current =
      command.pageId === currentPageId &&
      (command.type === 'set-adaptation-view' ||
        command.revision === currentRevision);
    if (!current) {
      ipcRenderer.send(ADAPTATION_EVENT_CHANNEL, {
        changedTargetCount: 0,
        error: 'The page changed before AURA could apply this presentation.',
        operation:
          command.type === 'apply-presentation' ||
          command.type === 'update-presentation'
            ? 'presentation'
            : command.type === 'apply-semantic'
              ? 'semantic'
              : 'view',
        pageId: command.pageId,
        status: 'failed',
        view:
          command.type === 'set-adaptation-view'
            ? command.view
            : 'original',
      });
      return;
    }
    ipcRenderer.send(
      ADAPTATION_EVENT_CHANNEL,
      adaptationRuntime.handleCommand(command),
    );
  },
);

window.addEventListener(
  'pagehide',
  () => {
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
