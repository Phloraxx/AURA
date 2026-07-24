import { join } from 'node:path';

import {
  app,
  BrowserWindow,
  ipcMain,
  WebContentsView,
  type IpcMainEvent,
} from 'electron';

import {
  IPC_CHANNELS,
  type BrowserNavigationState,
  type PageRuntimeEvent,
} from '../shared/contracts';
import { getPageViewBounds } from './layout';
import { normalizeAddress } from './navigation';

const DEFAULT_URL = 'https://www.wikipedia.org/';

let mainWindow: BrowserWindow | null = null;
let pageView: WebContentsView | null = null;
let panelOpen = true;
let navigationError: string | null = null;

function getPreloadPath(name: 'page' | 'shell'): string {
  return join(__dirname, `../preload/${name}.cjs`);
}

function updatePageBounds(): void {
  if (mainWindow === null || pageView === null) {
    return;
  }

  const [width = 0, height = 0] = mainWindow.getContentSize();
  pageView.setBounds(getPageViewBounds(width, height, panelOpen));
}

function getNavigationState(): BrowserNavigationState {
  if (pageView === null) {
    return {
      canGoBack: false,
      canGoForward: false,
      error: navigationError,
      isLoading: false,
      title: 'AURA',
      url: '',
    };
  }

  return {
    canGoBack: pageView.webContents.navigationHistory.canGoBack(),
    canGoForward: pageView.webContents.navigationHistory.canGoForward(),
    error: navigationError,
    isLoading: pageView.webContents.isLoading(),
    title: pageView.webContents.getTitle() || 'New page',
    url: pageView.webContents.getURL(),
  };
}

function publishNavigationState(): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(
      IPC_CHANNELS.navigationState,
      getNavigationState(),
    );
  }
}

function publishPageRuntimeEvent(event: PageRuntimeEvent): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(IPC_CHANNELS.pageRuntimeEvent, event);
  }
}

async function loadPage(address: string): Promise<void> {
  if (pageView === null) {
    return;
  }

  navigationError = null;
  publishNavigationState();

  try {
    await pageView.webContents.loadURL(normalizeAddress(address));
  } catch (error) {
    navigationError =
      error instanceof Error ? error.message : 'This page could not be loaded.';
    publishNavigationState();
  }
}

function attachPageEvents(view: WebContentsView): void {
  const { webContents } = view;

  webContents.on('did-start-loading', () => {
    navigationError = null;
    publishNavigationState();
  });
  webContents.on('did-stop-loading', publishNavigationState);
  webContents.on('did-navigate', publishNavigationState);
  webContents.on('did-navigate-in-page', publishNavigationState);
  webContents.on('page-title-updated', publishNavigationState);
  webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }
      navigationError = errorDescription;
      publishNavigationState();
    },
  );

  webContents.setWindowOpenHandler(({ url }) => {
    void loadPage(url);
    return { action: 'deny' };
  });
}

function registerIpc(): void {
  ipcMain.handle(IPC_CHANNELS.navigate, (_event, address: string) =>
    loadPage(address),
  );
  ipcMain.handle(IPC_CHANNELS.back, () => {
    if (pageView?.webContents.navigationHistory.canGoBack() === true) {
      pageView.webContents.navigationHistory.goBack();
    }
  });
  ipcMain.handle(IPC_CHANNELS.forward, () => {
    if (pageView?.webContents.navigationHistory.canGoForward() === true) {
      pageView.webContents.navigationHistory.goForward();
    }
  });
  ipcMain.handle(IPC_CHANNELS.refresh, () => {
    pageView?.webContents.reload();
  });
  ipcMain.handle(IPC_CHANNELS.setPanelOpen, (_event, open: boolean) => {
    panelOpen = open;
    updatePageBounds();
  });
  ipcMain.on(
    IPC_CHANNELS.pageRuntimeEvent,
    (event: IpcMainEvent, payload: PageRuntimeEvent) => {
      if (event.sender === pageView?.webContents) {
        publishPageRuntimeEvent(payload);
      }
    },
  );
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#f4f2ec',
    title: 'AURA',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 24 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath('shell'),
    },
  });

  pageView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath('page'),
      sandbox: true,
    },
  });

  mainWindow.contentView.addChildView(pageView);
  attachPageEvents(pageView);
  updatePageBounds();

  mainWindow.on('resize', updatePageBounds);
  mainWindow.on('closed', () => {
    pageView?.webContents.close();
    pageView = null;
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL !== undefined) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  await loadPage(DEFAULT_URL);
}

registerIpc();

void app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
