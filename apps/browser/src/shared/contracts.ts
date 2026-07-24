export const IPC_CHANNELS = {
  back: 'aura:navigation:back',
  forward: 'aura:navigation:forward',
  navigate: 'aura:navigation:open',
  navigationState: 'aura:navigation:state',
  pageRuntimeEvent: 'aura:page-runtime:event',
  refresh: 'aura:navigation:refresh',
  setPanelOpen: 'aura:layout:set-panel-open',
} as const;

export interface BrowserNavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
  isLoading: boolean;
  title: string;
  url: string;
}

export type PageRuntimePhase = 'preload-started' | 'dom-ready';

export interface PageRuntimeEvent {
  phase: PageRuntimePhase;
  readyState: DocumentReadyState;
  title: string;
  url: string;
}

export interface AuraShellApi {
  back: () => Promise<void>;
  forward: () => Promise<void>;
  navigate: (address: string) => Promise<void>;
  onNavigationState: (
    listener: (state: BrowserNavigationState) => void,
  ) => () => void;
  onPageRuntimeEvent: (
    listener: (event: PageRuntimeEvent) => void,
  ) => () => void;
  refresh: () => Promise<void>;
  setPanelOpen: (open: boolean) => Promise<void>;
}
