import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
import {
  pageModelSchema,
  pageRuntimeCommandSchema,
  type PageIntelligenceState,
  type PageModel,
} from '../shared/page-model';
import {
  browserProfileSchema,
  onboardingTurnRequestSchema,
} from '../shared/profile';
import { createOnboardingProvider } from './ai/onboarding-provider';
import { getPageViewBounds } from './layout';
import { normalizeAddress } from './navigation';
import { ProfileStore } from './profile-store';

const DEFAULT_URL = 'https://www.wikipedia.org/';
const APP_DIRECTORY = dirname(fileURLToPath(import.meta.url));

if (process.env.AURA_CDP_PORT !== undefined) {
  app.commandLine.appendSwitch(
    'remote-debugging-port',
    process.env.AURA_CDP_PORT,
  );
}

let mainWindow: BrowserWindow | null = null;
let pageView: WebContentsView | null = null;
let panelOpen = true;
let onboardingActive = true;
let navigationError: string | null = null;
let pageIntelligenceState: PageIntelligenceState | null = null;
let screenshotRequest = 0;
let profileStore: ProfileStore | null = null;

const onboardingProvider = createOnboardingProvider();

function getPreloadPath(name: 'page' | 'shell'): string {
  return join(APP_DIRECTORY, `../preload/${name}.cjs`);
}

function updatePageBounds(): void {
  if (mainWindow === null || pageView === null) {
    return;
  }

  pageView.setVisible(!onboardingActive);
  if (onboardingActive) return;

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

function publishPageIntelligenceState(): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(
      IPC_CHANNELS.pageIntelligenceState,
      pageIntelligenceState,
    );
  }
}

function invalidatePageIntelligence(): void {
  screenshotRequest += 1;
  pageIntelligenceState = null;
  publishPageIntelligenceState();
}

function urlsReferToCurrentDocument(modelUrl: string, currentUrl: string): boolean {
  try {
    const model = new URL(modelUrl);
    const current = new URL(currentUrl);
    model.hash = '';
    current.hash = '';
    return model.href === current.href;
  } catch {
    return modelUrl === currentUrl;
  }
}

async function capturePageScreenshot(model: PageModel): Promise<void> {
  if (pageView === null) return;
  const request = screenshotRequest + 1;
  screenshotRequest = request;
  const startedAt = performance.now();

  pageIntelligenceState = {
    model,
    screenshot: {
      byteLength: 0,
      capturedAt: null,
      durationMs: null,
      error: null,
      height: 0,
      status: 'pending',
      width: 0,
    },
  };
  publishPageIntelligenceState();

  try {
    const image = await pageView.webContents.capturePage();
    if (
      request !== screenshotRequest ||
      pageIntelligenceState?.model.pageId !== model.pageId ||
      pageIntelligenceState.model.revision !== model.revision
    ) {
      return;
    }
    const size = image.getSize();
    const png = image.toPNG();
    pageIntelligenceState = {
      model,
      screenshot: {
        byteLength: png.byteLength,
        capturedAt: new Date().toISOString(),
        durationMs:
          Math.round((performance.now() - startedAt) * 10) / 10,
        error: image.isEmpty() ? 'Chromium returned an empty screenshot.' : null,
        height: size.height,
        status: image.isEmpty() ? 'failed' : 'ready',
        width: size.width,
      },
    };
  } catch (error) {
    if (request !== screenshotRequest) return;
    pageIntelligenceState = {
      model,
      screenshot: {
        byteLength: 0,
        capturedAt: new Date().toISOString(),
        durationMs:
          Math.round((performance.now() - startedAt) * 10) / 10,
        error:
          error instanceof Error ? error.message : 'Screenshot capture failed.',
        height: 0,
        status: 'failed',
        width: 0,
      },
    };
  }
  publishPageIntelligenceState();
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
    invalidatePageIntelligence();
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
  ipcMain.handle(IPC_CHANNELS.getPageIntelligenceState, () => {
    return pageIntelligenceState;
  });
  ipcMain.handle(IPC_CHANNELS.getProfile, async () => {
    return profileStore?.load() ?? null;
  });
  ipcMain.handle(
    IPC_CHANNELS.saveProfile,
    async (_event, untrustedProfile: unknown) => {
      if (profileStore === null) throw new Error('Profile store is not ready.');
      const profile = browserProfileSchema.parse(untrustedProfile);
      return profileStore.save(profile);
    },
  );
  ipcMain.handle(IPC_CHANNELS.resetProfile, async () => {
    if (profileStore === null) throw new Error('Profile store is not ready.');
    await profileStore.reset();
    onboardingActive = true;
    updatePageBounds();
  });
  ipcMain.handle(
    IPC_CHANNELS.onboardingTurn,
    async (_event, untrustedRequest: unknown) => {
      const request = onboardingTurnRequestSchema.parse(untrustedRequest);
      return onboardingProvider.turn(request);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.debugPageTarget,
    (_event, untrustedCommand: unknown) => {
      const command = pageRuntimeCommandSchema.safeParse(untrustedCommand);
      if (!command.success || pageView === null || pageIntelligenceState === null) {
        return false;
      }
      const parsedCommand = command.data;
      const targetsCurrentModel =
        parsedCommand.pageId === pageIntelligenceState.model.pageId &&
        parsedCommand.revision === pageIntelligenceState.model.revision;
      const targetExists =
        parsedCommand.type === 'capture-now' ||
        pageIntelligenceState.model.elements.some(
          (element) => element.auraId === parsedCommand.auraId,
        );
      if (!targetsCurrentModel || !targetExists) return false;
      pageView.webContents.send(
        IPC_CHANNELS.pageRuntimeCommand,
        parsedCommand,
      );
      return true;
    },
  );
  ipcMain.handle(IPC_CHANNELS.setPanelOpen, (_event, open: boolean) => {
    panelOpen = open;
    updatePageBounds();
  });
  ipcMain.handle(
    IPC_CHANNELS.setOnboardingActive,
    (_event, active: boolean) => {
      onboardingActive = active;
      if (!active) panelOpen = true;
      updatePageBounds();
    },
  );
  ipcMain.on(
    IPC_CHANNELS.pageRuntimeEvent,
    (event: IpcMainEvent, payload: PageRuntimeEvent) => {
      if (event.sender === pageView?.webContents) {
        publishPageRuntimeEvent(payload);
      }
    },
  );
  ipcMain.on(
    IPC_CHANNELS.pageModel,
    (event: IpcMainEvent, untrustedModel: unknown) => {
      if (event.sender !== pageView?.webContents) return;
      const model = pageModelSchema.safeParse(untrustedModel);
      if (
        !model.success ||
        !urlsReferToCurrentDocument(
          model.data.url,
          pageView.webContents.getURL(),
        )
      ) {
        return;
      }
      void capturePageScreenshot(model.data);
    },
  );
}

async function createWindow(): Promise<void> {
  const savedProfile = await profileStore?.load();
  onboardingActive = savedProfile?.completedAt == null;

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
    pageIntelligenceState = null;
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL !== undefined) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(APP_DIRECTORY, '../renderer/index.html'));
  }

  await loadPage(DEFAULT_URL);
}

registerIpc();

void app.whenReady().then(async () => {
  profileStore = new ProfileStore(app.getPath('userData'));
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
