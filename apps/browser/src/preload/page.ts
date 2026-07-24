import { ipcRenderer } from 'electron';

import { createPageIntelligenceRuntime } from '../page-intelligence/runtime';
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

function report(phase: PageRuntimePhase): void {
  const event: PageRuntimeEvent = {
    phase,
    readyState: document.readyState,
    title: document.title,
    url: window.location.href,
  };
  ipcRenderer.send(PAGE_RUNTIME_CHANNEL, event);
}

const runtime = createPageIntelligenceRuntime((model) => {
  ipcRenderer.send(PAGE_MODEL_CHANNEL, model);
});

ipcRenderer.on(
  PAGE_COMMAND_CHANNEL,
  (_event, untrustedCommand: PageRuntimeCommand) => {
    const command = pageRuntimeCommandSchema.safeParse(untrustedCommand);
    if (command.success) runtime.handleCommand(command.data);
  },
);

window.addEventListener('pagehide', () => runtime.stop(), { once: true });

report('preload-started');
runtime.start();

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
