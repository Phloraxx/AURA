import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AuraShellApi,
  type BrowserNavigationState,
  type PageRuntimeEvent,
} from '../shared/contracts';

const api: AuraShellApi = {
  navigate: (address) => ipcRenderer.invoke(IPC_CHANNELS.navigate, address),
  back: () => ipcRenderer.invoke(IPC_CHANNELS.back),
  forward: () => ipcRenderer.invoke(IPC_CHANNELS.forward),
  refresh: () => ipcRenderer.invoke(IPC_CHANNELS.refresh),
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
