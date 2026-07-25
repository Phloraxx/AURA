import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  BrowserNavigationState,
  PageRuntimeEvent,
} from '../shared/contracts';
import type { AdaptationState, AdaptationView } from '../shared/adaptation';
import type { PageIntelligenceState } from '../shared/page-model';
import type { BrowserProfile } from '../shared/profile';
import {
  profileForRecomposePreset,
  type RecomposePreset,
} from '../shared/recompose';
import type { SemanticAnalysisState } from '../shared/semantic-analysis';
import type { ConversationState } from '../shared/conversation';
import {
  AuraBrand,
  AuraMark,
  AuraSparkIcon,
  BackIcon,
  CheckIcon,
  ForwardIcon,
  RefreshIcon,
} from './Brand';
import { LearnMe } from './LearnMe';
import { RecomposePresets } from './RecomposePresets';
import { TalkToAura } from './TalkToAura';

const EMPTY_NAVIGATION: BrowserNavigationState = {
  canGoBack: false,
  canGoForward: false,
  error: null,
  isLoading: true,
  title: 'AURA',
  url: '',
};

const EMPTY_ADAPTATION: AdaptationState = {
  changedTargetCount: 0,
  error: null,
  pageId: null,
  status: 'idle',
  view: 'original',
};

const EMPTY_SEMANTIC_ANALYSIS: SemanticAnalysisState = {
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

const EMPTY_CONVERSATION: ConversationState = {
  currentIntent: null,
  messages: [],
  pendingMemory: null,
  status: 'idle',
};

type LocalRecomposeStatus =
  | { status: 'idle' }
  | { status: 'running' }
  | {
      durationMs: number;
      error: string | null;
      model: string;
      status: 'fallback' | 'matched' | 'ready';
    };

function presetLabel(preset: RecomposePreset): string {
  switch (preset) {
    case 'clear_calm':
      return 'Clear & Calm';
    case 'easier_to_see':
      return 'Easier to See';
    case 'easy_to_control':
      return 'Easy to Control';
    case 'step_by_step':
      return 'Step by Step';
    default:
      return 'My profile';
  }
}

export function App(): React.JSX.Element {
  const [navigation, setNavigation] =
    useState<BrowserNavigationState>(EMPTY_NAVIGATION);
  const [address, setAddress] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [runtimeEvent, setRuntimeEvent] = useState<PageRuntimeEvent | null>(
    null,
  );
  const [pageIntelligence, setPageIntelligence] =
    useState<PageIntelligenceState | null>(null);
  const [adaptation, setAdaptation] =
    useState<AdaptationState>(EMPTY_ADAPTATION);
  const [semanticAnalysis, setSemanticAnalysis] =
    useState<SemanticAnalysisState>(EMPTY_SEMANTIC_ANALYSIS);
  const [conversation, setConversation] =
    useState<ConversationState>(EMPTY_CONVERSATION);
  const [profile, setProfile] = useState<BrowserProfile | null | undefined>(
    undefined,
  );
  const [selectedPreset, setSelectedPreset] =
    useState<RecomposePreset>('personalized');
  const [appliedPreset, setAppliedPreset] = useState<RecomposePreset | null>(
    null,
  );
  const [localRecompose, setLocalRecompose] = useState<LocalRecomposeStatus>({
    status: 'idle',
  });
  const editingAddress = useRef(false);
  const lastPageId = useRef<string | null>(null);
  const localRecomposeRequest = useRef(0);

  useEffect(() => {
    const removeNavigationListener = window.aura.onNavigationState((state) => {
      setNavigation(state);
      if (!editingAddress.current) setAddress(state.url);
    });
    const removeRuntimeListener =
      window.aura.onPageRuntimeEvent(setRuntimeEvent);
    const removeIntelligenceListener =
      window.aura.onPageIntelligenceState(setPageIntelligence);
    const removeAdaptationListener =
      window.aura.onAdaptationState(setAdaptation);
    const removeSemanticListener =
      window.aura.onSemanticAnalysisState(setSemanticAnalysis);
    const removeConversationListener =
      window.aura.onConversationState(setConversation);
    const removeFocusAddressListener = window.aura.onFocusAddress(() => {
      document.querySelector<HTMLInputElement>('#aura-address')?.focus();
    });
    void window.aura.getPageIntelligenceState().then(setPageIntelligence);
    void window.aura.getPageRuntimeState().then(setRuntimeEvent);
    void window.aura.getAdaptationState().then(setAdaptation);
    void window.aura.getSemanticAnalysisState().then(setSemanticAnalysis);
    void window.aura.getConversationState().then(setConversation);

    return () => {
      removeAdaptationListener();
      removeConversationListener();
      removeFocusAddressListener();
      removeIntelligenceListener();
      removeNavigationListener();
      removeRuntimeListener();
      removeSemanticListener();
    };
  }, []);

  useEffect(() => {
    const pageId = pageIntelligence?.model.pageId ?? null;
    if (pageId !== lastPageId.current) {
      lastPageId.current = pageId;
      localRecomposeRequest.current += 1;
      setAppliedPreset(null);
      setLocalRecompose({ status: 'idle' });
    }
  }, [pageIntelligence?.model.pageId]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (event.metaKey && event.key.toLocaleLowerCase() === 'l') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('#aura-address')?.focus();
      }
      if (
        event.metaKey &&
        event.shiftKey &&
        event.key.toLocaleLowerCase() === 'a'
      ) {
        event.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  useEffect(() => {
    void window.aura.getProfile().then((savedProfile) => {
      setProfile(savedProfile);
      void window.aura.setOnboardingActive(savedProfile?.completedAt == null);
    });
  }, []);

  function submitAddress(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    editingAddress.current = false;
    void window.aura.navigate(address);
  }

  function togglePanel(): void {
    const nextOpen = !panelOpen;
    setPanelOpen(nextOpen);
    void window.aura.setPanelOpen(nextOpen);
  }

  async function completeOnboarding(
    completedProfile: BrowserProfile,
  ): Promise<void> {
    const savedProfile = await window.aura.saveProfile(completedProfile);
    setProfile(savedProfile);
    setSelectedPreset('personalized');
    setPanelOpen(true);
    await window.aura.setOnboardingActive(false);
    await window.aura.setPanelOpen(true);
  }

  async function restartOnboarding(): Promise<void> {
    await window.aura.resetProfile();
    setProfile(null);
  }

  async function makeThisMine(): Promise<void> {
    if (
      profile === null ||
      profile === undefined ||
      pageIntelligence === null
    ) {
      return;
    }

    const resolvedProfile = profileForRecomposePreset(profile, selectedPreset);
    const model = pageIntelligence.model;
    const request = localRecomposeRequest.current + 1;
    localRecomposeRequest.current = request;
    setAppliedPreset(selectedPreset);
    setLocalRecompose({ status: 'running' });

    // Dispatch both operations in the same turn. Starting the local request
    // immediately invalidates any slower refinement from the previous preset,
    // while the synchronous presentation IPC is still registered first.
    const presentationResult = window.aura.applyPresentation(resolvedProfile);
    const localResult = window.aura
      .applyLocalRecompose({
        currentGoal: conversation.currentIntent?.goal ?? null,
        page: model,
        preset: selectedPreset,
        profile: resolvedProfile,
      })
      .then(
        (result) => ({ error: null, result }),
        (error: unknown) => ({ error, result: null }),
      );
    const applied = await presentationResult;
    if (
      request !== localRecomposeRequest.current ||
      lastPageId.current !== model.pageId
    ) {
      return;
    }
    if (!applied) {
      setLocalRecompose({
        durationMs: 0,
        error: 'AURA could not start the page transformation.',
        model: 'local',
        status: 'fallback',
      });
      return;
    }

    void localResult.then(({ error, result }) => {
      if (
        request !== localRecomposeRequest.current ||
        lastPageId.current !== model.pageId
      ) {
        return;
      }
      if (result === null) {
        setLocalRecompose({
          durationMs: 0,
          error:
            error instanceof Error
              ? error.message
              : 'Local Qwen is unavailable.',
          model: 'qwen3.5:4b-mlx',
          status: 'fallback',
        });
        return;
      }
      setLocalRecompose({
        durationMs: result.durationMs,
        error: result.error,
        model: result.model,
        status: result.applied
          ? 'ready'
          : result.output !== null && result.error === null
            ? 'matched'
            : 'fallback',
      });
    });
  }

  async function setAdaptationView(view: AdaptationView): Promise<void> {
    await window.aura.setAdaptationView(view);
  }

  async function sendConversation(message: string): Promise<void> {
    await window.aura.conversationTurn({ userMessage: message });
  }

  async function confirmMemory(): Promise<void> {
    const saved = await window.aura.confirmMemory();
    setProfile(saved);
  }

  async function updateMemory(preferences: string[]): Promise<void> {
    const saved = await window.aura.updateLearnedPreferences(preferences);
    setProfile(saved);
  }

  const pageConnectionFailed = navigation.error !== null;
  const pageConnectionReady = !pageConnectionFailed && runtimeEvent !== null;
  const canAdapt =
    pageConnectionReady &&
    !navigation.isLoading &&
    pageIntelligence !== null &&
    adaptation.status !== 'applying';

  if (profile === undefined) {
    return (
      <main className="profile-loading" aria-live="polite">
        <span className="brand-mark" aria-hidden="true">
          <AuraMark />
        </span>
        <p>Preparing AURA…</p>
      </main>
    );
  }

  if (profile === null || profile.completedAt === null) {
    return (
      <LearnMe
        initialProfile={profile ?? undefined}
        onComplete={completeOnboarding}
      />
    );
  }

  const shellStyle = {
    '--aura-ui-body-size': `${Math.round(14 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-leading': profile.preferences.lineSpacing,
    '--aura-ui-section-title-size': `${Math.round(20 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-small-size': `${Math.round(12 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-target': `${profile.preferences.targetSizePx}px`,
    '--aura-ui-title-size': `${Math.round(24 * profile.preferences.textScale * 10) / 10}px`,
  } as CSSProperties;

  const localStatusCopy =
    localRecompose.status === 'running'
      ? 'Choosing the most useful content and controls on this Mac…'
      : localRecompose.status === 'ready'
        ? `Applied in ${Math.round(localRecompose.durationMs)} ms.`
        : localRecompose.status === 'matched'
          ? `Checked in ${Math.round(localRecompose.durationMs)} ms. No extra rearrangement was needed.`
          : localRecompose.status === 'fallback'
            ? 'AURA’s built-in page structure remains active.'
            : null;

  return (
    <main
      className={panelOpen ? 'shell panel-open' : 'shell'}
      data-density={profile.preferences.informationDensity}
      data-reduce-motion={profile.preferences.reduceMotion ? 'true' : 'false'}
      style={shellStyle}
    >
      <header className="browser-chrome">
        <AuraBrand />

        <nav className="navigation-controls" aria-label="Page navigation">
          <button
            aria-label="Go back"
            className="icon-button"
            disabled={!navigation.canGoBack}
            onClick={() => void window.aura.back()}
            type="button"
          >
            <BackIcon aria-hidden="true" className="interface-icon" />
          </button>
          <button
            aria-label="Go forward"
            className="icon-button"
            disabled={!navigation.canGoForward}
            onClick={() => void window.aura.forward()}
            type="button"
          >
            <ForwardIcon aria-hidden="true" className="interface-icon" />
          </button>
          <button
            aria-label="Refresh page"
            className="icon-button"
            onClick={() => void window.aura.refresh()}
            type="button"
          >
            <RefreshIcon aria-hidden="true" className="interface-icon" />
          </button>
        </nav>

        <form className="address-form" onSubmit={submitAddress}>
          <span
            className={navigation.isLoading ? 'load-dot active' : 'load-dot'}
            aria-hidden="true"
          />
          <input
            aria-label="Search or enter address"
            aria-keyshortcuts="Meta+L"
            id="aura-address"
            onBlur={() => {
              editingAddress.current = false;
            }}
            onChange={(event) => {
              editingAddress.current = true;
              setAddress(event.target.value);
            }}
            onFocus={(event) => {
              editingAddress.current = true;
              event.currentTarget.select();
            }}
            placeholder="Search or enter address"
            spellCheck={false}
            value={address}
          />
        </form>

        <div className="page-status" aria-live="polite">
          {navigation.error === null ? (
            <span>{navigation.title}</span>
          ) : (
            <span className="error-message">{navigation.error}</span>
          )}
        </div>

        <button
          aria-expanded={panelOpen}
          aria-keyshortcuts="Meta+Shift+A"
          className="aura-toggle"
          onClick={togglePanel}
          type="button"
        >
          <AuraSparkIcon
            aria-hidden="true"
            className="interface-icon compact"
          />
          {panelOpen ? 'Close AURA' : 'Open AURA'}
        </button>
      </header>

      {panelOpen ? (
        <aside className="aura-panel" aria-label="AURA panel">
          <div className="panel-header">
            <div className="panel-symbol" aria-hidden="true">
              <AuraMark />
            </div>
            <div>
              <p className="eyebrow">AURA</p>
              <h1>Ready for this page.</h1>
            </div>
          </div>

          <p className="panel-copy">
            Adapt this page or ask for help without leaving what you are doing.
          </p>

          <details className="profile-card">
            <summary>Your comfort profile</summary>
            <p>{profile.summary}</p>
            <button onClick={() => void restartOnboarding()} type="button">
              Re-run Learn Me
            </button>
          </details>

          <div className="runtime-status" aria-live="polite">
            <span
              className={
                pageConnectionReady ? 'status-light ready' : 'status-light'
              }
              aria-hidden="true"
            />
            <div>
              <strong>
                {pageConnectionFailed
                  ? 'Page connection unavailable'
                  : pageConnectionReady
                    ? 'Page connection ready'
                    : 'Connecting to page'}
              </strong>
              <span>
                {pageConnectionFailed
                  ? navigation.error
                  : pageConnectionReady
                    ? 'The page is ready for AURA.'
                    : 'Waiting for the AURA page preload.'}
              </span>
            </div>
          </div>

          <RecomposePresets
            disabled={!canAdapt}
            onChange={setSelectedPreset}
            value={selectedPreset}
          />

          {adaptation.status === 'ready' ? (
            <div
              aria-label="Page presentation"
              className="adaptation-switch"
              role="group"
            >
              <button
                aria-pressed={adaptation.view === 'original'}
                onClick={() => void setAdaptationView('original')}
                type="button"
              >
                Original
              </button>
              <button
                aria-pressed={adaptation.view === 'aura'}
                onClick={() => void setAdaptationView('aura')}
                type="button"
              >
                AURA
              </button>
            </div>
          ) : null}

          <button
            className="primary-action"
            disabled={!canAdapt}
            onClick={() => void makeThisMine()}
            type="button"
          >
            {adaptation.status === 'applying'
              ? 'Reshaping this page…'
              : adaptation.status === 'ready' &&
                  appliedPreset !== selectedPreset
                ? `Remake as ${presetLabel(selectedPreset)}`
                : 'Make This Mine'}
          </button>

          <p
            className={
              adaptation.error === null
                ? 'adaptation-note'
                : 'adaptation-note error-message'
            }
            role={adaptation.error === null ? undefined : 'alert'}
          >
            {adaptation.error ??
              (adaptation.status === 'ready'
                ? adaptation.view === 'aura'
                  ? `${presetLabel(appliedPreset ?? selectedPreset)} is active. The real website remains underneath and Original restores it instantly.`
                  : 'The original website is restored. Your AURA version is preserved.'
                : pageIntelligence === null
                  ? 'AURA is understanding this page before making changes.'
                  : 'AURA can create a calmer view while preserving the original page.')}
          </p>

          {localStatusCopy !== null ? (
            <section
              aria-live="polite"
              className={`local-recompose-status ${localRecompose.status}`}
            >
              <span aria-hidden="true">
                {localRecompose.status === 'ready' ||
                localRecompose.status === 'matched' ? (
                  <CheckIcon className="status-glyph" />
                ) : (
                  <AuraSparkIcon className="status-glyph" />
                )}
              </span>
              <div>
                <strong>
                  {localRecompose.status === 'running'
                    ? 'Refining on this Mac…'
                    : localRecompose.status === 'ready'
                      ? 'On-device refinement ready'
                      : localRecompose.status === 'matched'
                        ? 'First layout already matched'
                        : 'Built-in layout active'}
                </strong>
                <p>{localStatusCopy}</p>
              </div>
            </section>
          ) : null}

          {semanticAnalysis.status !== 'idle' ? (
            <section
              aria-live="polite"
              className={`semantic-status ${semanticAnalysis.status}`}
            >
              <span aria-hidden="true">
                {semanticAnalysis.status === 'fallback' ? (
                  <CheckIcon className="status-glyph" />
                ) : (
                  <AuraSparkIcon className="status-glyph" />
                )}
              </span>
              <div>
                <strong>
                  {semanticAnalysis.status === 'analyzing'
                    ? 'Refining page details…'
                    : semanticAnalysis.status === 'ready'
                      ? semanticAnalysis.pagePurpose
                      : 'AURA is ready'}
                </strong>
                <p>
                  {semanticAnalysis.status === 'analyzing'
                    ? 'You can keep using the page while this finishes.'
                    : semanticAnalysis.status === 'ready'
                      ? semanticAnalysis.summary
                      : 'The current adapted page remains usable.'}
                </p>
              </div>
            </section>
          ) : null}

          <TalkToAura
            disabled={!pageConnectionReady || pageIntelligence === null}
            onConfirmMemory={confirmMemory}
            onDismissMemory={() => window.aura.dismissMemory()}
            onSend={sendConversation}
            onUpdateMemory={updateMemory}
            profile={profile}
            state={conversation}
          />
        </aside>
      ) : null}
    </main>
  );
}
