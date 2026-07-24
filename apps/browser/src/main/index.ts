import { randomUUID } from 'node:crypto';
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
  adaptationEventSchema,
  adaptationStateSchema,
  adaptationViewSchema,
  presentationSettingsFromProfile,
  type AdaptationState,
} from '../shared/adaptation';
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
import {
  semanticAnalysisStateSchema,
  type SemanticAnalysisState,
  type SemanticPlan,
} from '../shared/semantic-analysis';
import {
  conversationStateSchema,
  conversationTurnRequestSchema,
  conversationTurnResponseSchema,
  learnedPreferencesUpdateSchema,
  type ConversationState,
  type ConversationTurnResponse,
} from '../shared/conversation';
import { createConversationProvider } from './ai/conversation-provider';
import { createOnboardingProvider } from './ai/onboarding-provider';
import { createPageAnalysisProvider } from './ai/page-analysis-provider';
import { validateConversationTurn } from './ai/validate-conversation';
import { validatePageAnalysis } from './ai/validate-page-analysis';
import { getPageViewBounds } from './layout';
import { friendlyNavigationError, normalizeAddress } from './navigation';
import { ProfileStore } from './profile-store';

const DEFAULT_URL =
  process.env.AURA_START_URL?.trim() || 'https://www.wikipedia.org/';
const APP_DIRECTORY = dirname(fileURLToPath(import.meta.url));

if (process.env.AURA_USER_DATA_DIR?.trim()) {
  app.setPath('userData', process.env.AURA_USER_DATA_DIR.trim());
}

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
let adaptationState: AdaptationState = adaptationStateSchema.parse({
  changedTargetCount: 0,
  error: null,
  pageId: null,
  status: 'idle',
  view: 'original',
});
let semanticAnalysisState: SemanticAnalysisState =
  semanticAnalysisStateSchema.parse({
    appliedCount: 0,
    durationMs: null,
    error: null,
    pageId: null,
    pagePurpose: null,
    revision: null,
    source: null,
    status: 'idle',
    summary: null,
    usage: null,
  });
let latestSafeScreenshot: {
  dataUrl: string;
  pageId: string;
  revision: number;
} | null = null;
let semanticRequest = 0;
let pendingSemanticPlan: {
  durationMs: number;
  plan: SemanticPlan;
  usage: SemanticAnalysisState['usage'];
} | null = null;
let activeSemanticPlan: SemanticPlan | null = null;
let conversationState: ConversationState = conversationStateSchema.parse({
  currentIntent: null,
  messages: [],
  pendingMemory: null,
  status: 'idle',
});
let screenshotRequest = 0;
let profileStore: ProfileStore | null = null;

const onboardingProvider = createOnboardingProvider();
const pageAnalysisProvider = createPageAnalysisProvider();
const conversationProvider = createConversationProvider();

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

function publishAdaptationState(): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(
      IPC_CHANNELS.adaptationState,
      adaptationState,
    );
  }
}

function publishSemanticAnalysisState(): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(
      IPC_CHANNELS.semanticAnalysisState,
      semanticAnalysisState,
    );
  }
}

function publishConversationState(): void {
  if (mainWindow?.isDestroyed() === false) {
    mainWindow.webContents.send(
      IPC_CHANNELS.conversationState,
      conversationState,
    );
  }
}

function invalidateSemanticAnalysis(): void {
  semanticRequest += 1;
  latestSafeScreenshot = null;
  pendingSemanticPlan = null;
  activeSemanticPlan = null;
  semanticAnalysisState = {
    appliedCount: 0,
    durationMs: null,
    error: null,
    pageId: null,
    pagePurpose: null,
    revision: null,
    source: null,
    status: 'idle',
    summary: null,
    usage: null,
  };
  publishSemanticAnalysisState();
}

function appendConversationMessage(
  role: 'assistant' | 'user',
  content: string,
): void {
  conversationState = conversationStateSchema.parse({
    ...conversationState,
    messages: [
      ...conversationState.messages,
      { content, id: randomUUID(), role },
    ].slice(-24),
  });
}

function mergeConversationPlan(
  response: ConversationTurnResponse,
  model: PageModel,
): SemanticPlan | null {
  const patch = response.adaptationPatch;
  const explanationTarget = response.explanation?.targetAuraId;
  if (
    patch === null &&
    explanationTarget == null &&
    activeSemanticPlan === null
  ) {
    return null;
  }
  const base: SemanticPlan = activeSemanticPlan ?? {
    collapseTargetIds: [],
    deemphasizeTargetIds: [],
    guide: null,
    highlightTargetIds: [],
    importantFacts: [],
    pageId: model.pageId,
    pagePurpose: semanticAnalysisState.pagePurpose ?? model.title,
    primaryTargetIds: [],
    revision: model.revision,
    simplifications: [],
    summary:
      semanticAnalysisState.summary ??
      `AURA is helping with ${model.title || 'this page'}.`,
  };
  return {
    ...base,
    deemphasizeTargetIds:
      patch?.deemphasizeTargetIds ?? base.deemphasizeTargetIds,
    guide: patch?.guide ?? base.guide,
    highlightTargetIds: [
      ...(patch?.highlightTargetIds ?? base.highlightTargetIds),
      ...(explanationTarget == null ? [] : [explanationTarget]),
    ].filter((id, index, values) => values.indexOf(id) === index),
    pageId: model.pageId,
    primaryTargetIds:
      patch?.primaryTargetIds ?? base.primaryTargetIds,
    revision: model.revision,
  };
}

async function runConversationTurn(
  untrustedRequest: unknown,
): Promise<ConversationTurnResponse> {
  const request = conversationTurnRequestSchema.parse(untrustedRequest);
  if (pageIntelligenceState === null || profileStore === null) {
    throw new Error('Open a page and complete Learn Me before talking to AURA.');
  }
  const profile = await profileStore.load();
  if (profile?.completedAt == null) {
    throw new Error('Complete Learn Me before talking to AURA.');
  }
  const model = pageIntelligenceState.model;
  appendConversationMessage('user', request.userMessage);
  conversationState = { ...conversationState, status: 'responding' };
  publishConversationState();

  const providerResponse = await conversationProvider.turn({
    currentIntent: conversationState.currentIntent,
    page: model,
    profile,
    recentConversation: conversationState.messages,
    semanticPlan: activeSemanticPlan,
    userMessage: request.userMessage,
  });
  if (
    pageIntelligenceState === null ||
    pageIntelligenceState.model.pageId !== model.pageId
  ) {
    const staleResponse = conversationTurnResponseSchema.parse({
      ...providerResponse,
      adaptationPatch: null,
      adjustment: null,
      assistantMessage:
        'The page changed while I was responding. Your goal is preserved—ask me to continue on this page.',
      explanation: null,
    });
    appendConversationMessage('assistant', staleResponse.assistantMessage);
    conversationState = {
      ...conversationState,
      currentIntent: providerResponse.intent ?? conversationState.currentIntent,
      pendingMemory: providerResponse.memoryProposal,
      status: 'idle',
    };
    publishConversationState();
    return staleResponse;
  }

  const response = validateConversationTurn(providerResponse, model);
  conversationState = {
    ...conversationState,
    currentIntent: response.intent ?? conversationState.currentIntent,
    pendingMemory: response.memoryProposal,
  };

  if (response.adjustment !== null && pageView !== null) {
    const patch = response.adjustment;
    const adjustedProfile = browserProfileSchema.parse({
      ...profile,
      preferences: {
        ...profile.preferences,
        explanationStyle:
          patch.explanationStyle ?? profile.preferences.explanationStyle,
        informationDensity:
          patch.informationDensity ?? profile.preferences.informationDensity,
        preserveTechnicalTerms:
          patch.preserveTechnicalTerms ??
          profile.preferences.preserveTechnicalTerms,
        reduceMotion: patch.reduceMotion ?? profile.preferences.reduceMotion,
        targetSizePx: patch.targetSizePx ?? profile.preferences.targetSizePx,
        textScale: patch.textScale ?? profile.preferences.textScale,
      },
    });
    pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
      pageId: model.pageId,
      revision: model.revision,
      settings: presentationSettingsFromProfile(adjustedProfile),
      type:
        adaptationState.pageId === model.pageId
          ? 'update-presentation'
          : 'apply-presentation',
    });
  }

  const conversationPlan = mergeConversationPlan(response, model);
  if (conversationPlan !== null && pageView !== null) {
    if (adaptationState.pageId !== model.pageId) {
      pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
        pageId: model.pageId,
        revision: model.revision,
        settings: presentationSettingsFromProfile(profile),
        type: 'apply-presentation',
      });
    }
    activeSemanticPlan = conversationPlan;
    pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
      pageId: model.pageId,
      plan: conversationPlan,
      revision: model.revision,
      type: 'apply-semantic',
    });
  }

  appendConversationMessage('assistant', response.assistantMessage);
  conversationState = { ...conversationState, status: 'idle' };
  publishConversationState();
  return response;
}

function invalidateAdaptation(): void {
  adaptationState = {
    changedTargetCount: 0,
    error: null,
    pageId: null,
    status: 'idle',
    view: 'original',
  };
  publishAdaptationState();
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
  latestSafeScreenshot = null;
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
    if (
      !image.isEmpty() &&
      !model.privacy.hasNonEmptyEditableControl &&
      !model.privacy.hasPasswordControl
    ) {
      latestSafeScreenshot = {
        dataUrl: `data:image/png;base64,${png.toString('base64')}`,
        pageId: model.pageId,
        revision: model.revision,
      };
    }
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

async function runPageAnalysis(
  profile: ReturnType<typeof browserProfileSchema.parse>,
  initialModel: PageModel,
): Promise<void> {
  const request = semanticRequest + 1;
  semanticRequest = request;
  const startedAt = performance.now();
  const screenshotDataUrl =
    latestSafeScreenshot?.pageId === initialModel.pageId &&
    latestSafeScreenshot.revision === initialModel.revision
      ? latestSafeScreenshot.dataUrl
      : null;
  semanticAnalysisState = {
    appliedCount: 0,
    durationMs: null,
    error: null,
    pageId: initialModel.pageId,
    pagePurpose: null,
    revision: initialModel.revision,
    source: null,
    status: 'analyzing',
    summary: null,
    usage: null,
  };
  publishSemanticAnalysisState();

  const result = await pageAnalysisProvider.analyze({
    page: initialModel,
    profile,
    screenshotDataUrl,
  });
  if (
    request !== semanticRequest ||
    pageView === null ||
    pageIntelligenceState === null ||
    pageIntelligenceState.model.pageId !== initialModel.pageId
  ) {
    return;
  }
  const durationMs =
    Math.round((performance.now() - startedAt) * 10) / 10;
  if (result.source === 'fallback' || result.output === null) {
    semanticAnalysisState = {
      appliedCount: 0,
      durationMs,
      error: result.error,
      pageId: initialModel.pageId,
      pagePurpose: null,
      revision: pageIntelligenceState.model.revision,
      source: 'fallback',
      status: 'fallback',
      summary: null,
      usage: result.usage,
    };
    publishSemanticAnalysisState();
    return;
  }

  const currentModel = pageIntelligenceState.model;
  const plan = validatePageAnalysis(result.output, currentModel, profile);
  pendingSemanticPlan = {
    durationMs,
    plan,
    usage: result.usage,
  };
  pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
    pageId: currentModel.pageId,
    plan,
    revision: currentModel.revision,
    type: 'apply-semantic',
  });
}

async function loadPage(address: string): Promise<void> {
  if (pageView === null) {
    return;
  }

  navigationError = null;
  publishNavigationState();

  try {
    await pageView.webContents.loadURL(normalizeAddress(address));
  } catch {
    navigationError = friendlyNavigationError(null);
    publishNavigationState();
  }
}

function attachPageEvents(view: WebContentsView): void {
  const { webContents } = view;

  webContents.on('before-input-event', (event, input) => {
    if (
      input.meta &&
      !input.alt &&
      !input.control &&
      input.key.toLocaleLowerCase() === 'l'
    ) {
      event.preventDefault();
      mainWindow?.webContents.focus();
      mainWindow?.webContents.send(IPC_CHANNELS.focusAddress);
    }
  });
  webContents.on('did-start-loading', () => {
    navigationError = null;
    invalidateSemanticAnalysis();
    invalidateAdaptation();
    invalidatePageIntelligence();
    publishNavigationState();
  });
  webContents.on('did-stop-loading', publishNavigationState);
  webContents.on('did-navigate', publishNavigationState);
  webContents.on('did-navigate-in-page', publishNavigationState);
  webContents.on('page-title-updated', publishNavigationState);
  webContents.on(
    'did-fail-load',
    (_event, errorCode, _errorDescription, _validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }
      navigationError = friendlyNavigationError(errorCode);
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
  ipcMain.handle(IPC_CHANNELS.getAdaptationState, () => adaptationState);
  ipcMain.handle(IPC_CHANNELS.getConversationState, () => conversationState);
  ipcMain.handle(
    IPC_CHANNELS.getSemanticAnalysisState,
    () => semanticAnalysisState,
  );
  ipcMain.handle(
    IPC_CHANNELS.applyPresentation,
    (_event, untrustedProfile: unknown) => {
      const profile = browserProfileSchema.safeParse(untrustedProfile);
      if (
        !profile.success ||
        pageView === null ||
        pageIntelligenceState === null
      ) {
        return false;
      }
      const { model } = pageIntelligenceState;
      adaptationState = {
        changedTargetCount: 0,
        error: null,
        pageId: model.pageId,
        status: 'applying',
        view: 'original',
      };
      publishAdaptationState();
      pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
        pageId: model.pageId,
        revision: model.revision,
        settings: presentationSettingsFromProfile(profile.data),
        type: 'apply-presentation',
      });
      void runPageAnalysis(profile.data, model);
      return true;
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.setAdaptationView,
    (_event, untrustedView: unknown) => {
      const view = adaptationViewSchema.safeParse(untrustedView);
      if (
        !view.success ||
        pageView === null ||
        pageIntelligenceState === null ||
        adaptationState.pageId === null ||
        adaptationState.pageId !== pageIntelligenceState.model.pageId
      ) {
        return false;
      }
      pageView.webContents.send(IPC_CHANNELS.adaptationCommand, {
        pageId: adaptationState.pageId,
        type: 'set-adaptation-view',
        view: view.data,
      });
      return true;
    },
  );
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
    conversationState = conversationStateSchema.parse({
      currentIntent: null,
      messages: [],
      pendingMemory: null,
      status: 'idle',
    });
    publishConversationState();
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
    IPC_CHANNELS.conversationTurn,
    async (_event, untrustedRequest: unknown) => {
      try {
        return await runConversationTurn(untrustedRequest);
      } catch (error) {
        conversationState = { ...conversationState, status: 'idle' };
        publishConversationState();
        throw error;
      }
    },
  );
  ipcMain.handle(IPC_CHANNELS.confirmMemory, async () => {
    if (profileStore === null) throw new Error('Profile store is not ready.');
    if (conversationState.pendingMemory === null) {
      throw new Error('There is no preference waiting for confirmation.');
    }
    const profile = await profileStore.load();
    if (profile === null) throw new Error('Complete Learn Me first.');
    const preference = conversationState.pendingMemory.preference;
    const learnedPreferences = [
      ...profile.learnedPreferences.filter(
        (item) => item.toLocaleLowerCase() !== preference.toLocaleLowerCase(),
      ),
      preference,
    ].slice(-20);
    const saved = await profileStore.save({
      ...profile,
      learnedPreferences,
      updatedAt: new Date().toISOString(),
    });
    conversationState = {
      ...conversationState,
      pendingMemory: null,
    };
    appendConversationMessage('assistant', 'Remembered. I’ll use that preference on later pages.');
    publishConversationState();
    return saved;
  });
  ipcMain.handle(IPC_CHANNELS.dismissMemory, () => {
    conversationState = {
      ...conversationState,
      pendingMemory: null,
    };
    publishConversationState();
  });
  ipcMain.handle(
    IPC_CHANNELS.updateLearnedPreferences,
    async (_event, untrustedUpdate: unknown) => {
      if (profileStore === null) throw new Error('Profile store is not ready.');
      const update = learnedPreferencesUpdateSchema.parse(untrustedUpdate);
      const profile = await profileStore.load();
      if (profile === null) throw new Error('Complete Learn Me first.');
      const learnedPreferences = update.preferences
        .map((preference) => preference.trim())
        .filter(
          (preference, index, preferences) =>
            preference.length > 0 &&
            preferences.findIndex(
              (candidate) =>
                candidate.toLocaleLowerCase() ===
                preference.toLocaleLowerCase(),
            ) === index,
        )
        .slice(-20);
      return profileStore.save({
        ...profile,
        learnedPreferences,
        updatedAt: new Date().toISOString(),
      });
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
    IPC_CHANNELS.adaptationEvent,
    (event: IpcMainEvent, untrustedPayload: unknown) => {
      if (event.sender !== pageView?.webContents) return;
      const payload = adaptationEventSchema.safeParse(untrustedPayload);
      if (
        !payload.success ||
        pageIntelligenceState === null ||
        payload.data.pageId !== pageIntelligenceState.model.pageId
      ) {
        return;
      }
      adaptationState = {
        changedTargetCount: payload.data.changedTargetCount,
        error: payload.data.error,
        pageId: payload.data.pageId,
        status: payload.data.status === 'failed' ? 'idle' : 'ready',
        view: payload.data.view,
      };
      publishAdaptationState();
      if (
        payload.data.operation === 'semantic' &&
        pendingSemanticPlan?.plan.pageId === payload.data.pageId
      ) {
        if (payload.data.status !== 'failed') {
          activeSemanticPlan = pendingSemanticPlan.plan;
        }
        semanticAnalysisState = {
          appliedCount:
            payload.data.status === 'failed'
              ? 0
              : payload.data.changedTargetCount,
          durationMs: pendingSemanticPlan.durationMs,
          error: payload.data.error,
          pageId: pendingSemanticPlan.plan.pageId,
          pagePurpose: pendingSemanticPlan.plan.pagePurpose,
          revision: pendingSemanticPlan.plan.revision,
          source: 'ai',
          status:
            payload.data.status === 'failed' ? 'fallback' : 'ready',
          summary: pendingSemanticPlan.plan.summary,
          usage: pendingSemanticPlan.usage,
        };
        pendingSemanticPlan = null;
        publishSemanticAnalysisState();
      }
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
    invalidateSemanticAnalysis();
    invalidateAdaptation();
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
