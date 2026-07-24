import type {
  PageIntelligenceState,
  PageRuntimeCommand,
} from './page-model';

export const IPC_CHANNELS = {
  back: 'aura:navigation:back',
  debugPageTarget: 'aura:page-intelligence:debug-target',
  forward: 'aura:navigation:forward',
  getPageIntelligenceState: 'aura:page-intelligence:get-state',
  navigate: 'aura:navigation:open',
  navigationState: 'aura:navigation:state',
  pageIntelligenceState: 'aura:page-intelligence:state',
  pageModel: 'aura:page-intelligence:model',
  pageRuntimeCommand: 'aura:page-runtime:command',
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
  debugPageTarget: (command: PageRuntimeCommand) => Promise<boolean>;
  forward: () => Promise<void>;
  getPageIntelligenceState: () => Promise<PageIntelligenceState | null>;
  navigate: (address: string) => Promise<void>;
  onNavigationState: (
    listener: (state: BrowserNavigationState) => void,
  ) => () => void;
  onPageIntelligenceState: (
    listener: (state: PageIntelligenceState | null) => void,
  ) => () => void;
  onPageRuntimeEvent: (
    listener: (event: PageRuntimeEvent) => void,
  ) => () => void;
  refresh: () => Promise<void>;
  setPanelOpen: (open: boolean) => Promise<void>;
}
