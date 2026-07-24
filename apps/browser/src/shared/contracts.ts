import type {
  PageIntelligenceState,
  PageRuntimeCommand,
} from './page-model';
import type {
  BrowserProfile,
  OnboardingTurnRequest,
  OnboardingTurnResponse,
} from './profile';
import type {
  AdaptationCommand,
  AdaptationState,
  AdaptationView,
} from './adaptation';
import type { SemanticAnalysisState } from './semantic-analysis';

export const IPC_CHANNELS = {
  adaptationCommand: 'aura:adaptation:command',
  adaptationEvent: 'aura:adaptation:event',
  adaptationState: 'aura:adaptation:state',
  applyPresentation: 'aura:adaptation:apply-presentation',
  back: 'aura:navigation:back',
  debugPageTarget: 'aura:page-intelligence:debug-target',
  forward: 'aura:navigation:forward',
  getPageIntelligenceState: 'aura:page-intelligence:get-state',
  getAdaptationState: 'aura:adaptation:get-state',
  getProfile: 'aura:profile:get',
  getSemanticAnalysisState: 'aura:semantic:get-state',
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
  semanticAnalysisState: 'aura:semantic:state',
  setOnboardingActive: 'aura:layout:set-onboarding-active',
  setPanelOpen: 'aura:layout:set-panel-open',
  setAdaptationView: 'aura:adaptation:set-view',
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
  applyPresentation: (profile: BrowserProfile) => Promise<boolean>;
  back: () => Promise<void>;
  debugPageTarget: (command: PageRuntimeCommand) => Promise<boolean>;
  forward: () => Promise<void>;
  getAdaptationState: () => Promise<AdaptationState>;
  getPageIntelligenceState: () => Promise<PageIntelligenceState | null>;
  getProfile: () => Promise<BrowserProfile | null>;
  getSemanticAnalysisState: () => Promise<SemanticAnalysisState>;
  navigate: (address: string) => Promise<void>;
  onboardingTurn: (
    request: OnboardingTurnRequest,
  ) => Promise<OnboardingTurnResponse>;
  onAdaptationState: (
    listener: (state: AdaptationState) => void,
  ) => () => void;
  onNavigationState: (
    listener: (state: BrowserNavigationState) => void,
  ) => () => void;
  onPageIntelligenceState: (
    listener: (state: PageIntelligenceState | null) => void,
  ) => () => void;
  onPageRuntimeEvent: (
    listener: (event: PageRuntimeEvent) => void,
  ) => () => void;
  onSemanticAnalysisState: (
    listener: (state: SemanticAnalysisState) => void,
  ) => () => void;
  refresh: () => Promise<void>;
  resetProfile: () => Promise<void>;
  saveProfile: (profile: BrowserProfile) => Promise<BrowserProfile>;
  setAdaptationView: (view: AdaptationView) => Promise<boolean>;
  setOnboardingActive: (active: boolean) => Promise<void>;
  setPanelOpen: (open: boolean) => Promise<void>;
}

export type PageAdaptationCommand = AdaptationCommand;
