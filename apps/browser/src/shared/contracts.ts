import type {
  PageIntelligenceState,
  PageRuntimeCommand,
} from './page-model';
import type {
  BrowserProfile,
  OnboardingTurnRequest,
  OnboardingTurnResponse,
} from './profile';

export const IPC_CHANNELS = {
  back: 'aura:navigation:back',
  debugPageTarget: 'aura:page-intelligence:debug-target',
  forward: 'aura:navigation:forward',
  getPageIntelligenceState: 'aura:page-intelligence:get-state',
  getProfile: 'aura:profile:get',
  navigate: 'aura:navigation:open',
  navigationState: 'aura:navigation:state',
  onboardingTurn: 'aura:onboarding:turn',
  pageIntelligenceState: 'aura:page-intelligence:state',
  pageModel: 'aura:page-intelligence:model',
  pageRuntimeCommand: 'aura:page-runtime:command',
  pageRuntimeEvent: 'aura:page-runtime:event',
  refresh: 'aura:navigation:refresh',
  resetProfile: 'aura:profile:reset',
  saveProfile: 'aura:profile:save',
  setOnboardingActive: 'aura:layout:set-onboarding-active',
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
  getProfile: () => Promise<BrowserProfile | null>;
  navigate: (address: string) => Promise<void>;
  onboardingTurn: (
    request: OnboardingTurnRequest,
  ) => Promise<OnboardingTurnResponse>;
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
  resetProfile: () => Promise<void>;
  saveProfile: (profile: BrowserProfile) => Promise<BrowserProfile>;
  setOnboardingActive: (active: boolean) => Promise<void>;
  setPanelOpen: (open: boolean) => Promise<void>;
}
