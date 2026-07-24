import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AuraShellApi,
  type BrowserNavigationState,
  type PageRuntimeEvent,
} from '../shared/contracts';
import type {
  PageIntelligenceState,
  PageRuntimeCommand,
} from '../shared/page-model';

const api: AuraShellApi = {
  navigate: (address) => ipcRenderer.invoke(IPC_CHANNELS.navigate, address),
  back: () => ipcRenderer.invoke(IPC_CHANNELS.back),
  debugPageTarget: (command: PageRuntimeCommand) =>
    ipcRenderer.invoke(IPC_CHANNELS.debugPageTarget, command),
  forward: () => ipcRenderer.invoke(IPC_CHANNELS.forward),
  getPageIntelligenceState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getPageIntelligenceState),
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.getProfile),
  onboardingTurn: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.onboardingTurn, request),
  refresh: () => ipcRenderer.invoke(IPC_CHANNELS.refresh),
  resetProfile: () => ipcRenderer.invoke(IPC_CHANNELS.resetProfile),
  saveProfile: (profile) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveProfile, profile),
  setOnboardingActive: (active) =>
    ipcRenderer.invoke(IPC_CHANNELS.setOnboardingActive, active),
  setPanelOpen: (open) =>
    ipcRenderer.invoke(IPC_CHANNELS.setPanelOpen, open),
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
};

contextBridge.exposeInMainWorld('aura', api);
