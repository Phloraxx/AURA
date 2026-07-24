import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AuraShellApi,
  type BrowserNavigationState,
  type PageRuntimeEvent,
} from '../shared/contracts';
import type { AdaptationState } from '../shared/adaptation';
import type { ConversationState } from '../shared/conversation';
import type { SemanticAnalysisState } from '../shared/semantic-analysis';
import type {
  PageIntelligenceState,
  PageRuntimeCommand,
} from '../shared/page-model';

const api: AuraShellApi = {
  applyPresentation: (profile) =>
    ipcRenderer.invoke(IPC_CHANNELS.applyPresentation, profile),
  back: () => ipcRenderer.invoke(IPC_CHANNELS.back),
  confirmMemory: () => ipcRenderer.invoke(IPC_CHANNELS.confirmMemory),
  conversationTurn: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.conversationTurn, request),
  debugPageTarget: (command: PageRuntimeCommand) =>
    ipcRenderer.invoke(IPC_CHANNELS.debugPageTarget, command),
  dismissMemory: () => ipcRenderer.invoke(IPC_CHANNELS.dismissMemory),
  forward: () => ipcRenderer.invoke(IPC_CHANNELS.forward),
  getAdaptationState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getAdaptationState),
  getConversationState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getConversationState),
  getPageIntelligenceState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getPageIntelligenceState),
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.getProfile),
  getSemanticAnalysisState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getSemanticAnalysisState),
  navigate: (address) => ipcRenderer.invoke(IPC_CHANNELS.navigate, address),
  onboardingTurn: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.onboardingTurn, request),
  refresh: () => ipcRenderer.invoke(IPC_CHANNELS.refresh),
  resetProfile: () => ipcRenderer.invoke(IPC_CHANNELS.resetProfile),
  saveProfile: (profile) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveProfile, profile),
  setAdaptationView: (view) =>
    ipcRenderer.invoke(IPC_CHANNELS.setAdaptationView, view),
  setOnboardingActive: (active) =>
    ipcRenderer.invoke(IPC_CHANNELS.setOnboardingActive, active),
  setPanelOpen: (open) =>
    ipcRenderer.invoke(IPC_CHANNELS.setPanelOpen, open),
  updateLearnedPreferences: (preferences) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateLearnedPreferences, { preferences }),
  onAdaptationState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: AdaptationState,
    ): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.adaptationState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.adaptationState, handler);
    };
  },
  onConversationState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: ConversationState,
    ): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.conversationState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.conversationState, handler);
    };
  },
  onFocusAddress: (listener) => {
    const handler = (): void => listener();
    ipcRenderer.on(IPC_CHANNELS.focusAddress, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.focusAddress, handler);
    };
  },
  onNavigationState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: BrowserNavigationState,
    ): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.navigationState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.navigationState, handler);
    };
  },
  onPageIntelligenceState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: PageIntelligenceState | null,
    ): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.pageIntelligenceState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.pageIntelligenceState, handler);
    };
  },
  onPageRuntimeEvent: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      runtimeEvent: PageRuntimeEvent,
    ): void => {
      listener(runtimeEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.pageRuntimeEvent, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.pageRuntimeEvent, handler);
    };
  },
  onSemanticAnalysisState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: SemanticAnalysisState,
    ): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.semanticAnalysisState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.semanticAnalysisState, handler);
    };
  },
};

contextBridge.exposeInMainWorld('aura', api);
