import { ipcRenderer } from 'electron';

type PageRuntimePhase = 'preload-started' | 'dom-ready';

interface PageRuntimeEvent {
  phase: PageRuntimePhase;
  readyState: DocumentReadyState;
  title: string;
  url: string;
}

const PAGE_RUNTIME_CHANNEL = 'aura:page-runtime:event';

function report(phase: PageRuntimePhase): void {
  const event: PageRuntimeEvent = {
    phase,
    readyState: document.readyState,
    title: document.title,
    url: window.location.href,
  };
  ipcRenderer.send(PAGE_RUNTIME_CHANNEL, event);
}

report('preload-started');

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
