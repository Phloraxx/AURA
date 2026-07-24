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

report('preload-started');
intelligenceRuntime.start();

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      report('dom-ready');
    },
    { once: true },
  );
} else {
  report('dom-ready');
}
