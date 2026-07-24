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
  const editingAddress = useRef(false);

  useEffect(() => {
    const removeNavigationListener = window.aura.onNavigationState((state) => {
      setNavigation(state);
      if (!editingAddress.current) {
        setAddress(state.url);
      }
    });
    const removeRuntimeListener = window.aura.onPageRuntimeEvent((event) => {
      setRuntimeEvent(event);
    });
    const removeIntelligenceListener = window.aura.onPageIntelligenceState(
      (state) => {
        setPageIntelligence(state);
      },
    );
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
    void window.aura
      .getSemanticAnalysisState()
      .then(setSemanticAnalysis);
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
    setPanelOpen(true);
    await window.aura.setOnboardingActive(false);
    await window.aura.setPanelOpen(true);
  }

  async function restartOnboarding(): Promise<void> {
    await window.aura.resetProfile();
    setProfile(null);
  }

  async function makeThisMine(): Promise<void> {
    if (profile === null || profile === undefined) return;
    await window.aura.applyPresentation(profile);
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
  const pageConnectionReady =
    !pageConnectionFailed && runtimeEvent !== null;
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
    return <LearnMe initialProfile={profile ?? undefined} onComplete={completeOnboarding} />;
  }

  const shellStyle = {
    '--aura-ui-body-size': `${Math.round(14 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-leading': profile.preferences.lineSpacing,
    '--aura-ui-section-title-size': `${Math.round(20 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-small-size': `${Math.round(12 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-target': `${profile.preferences.targetSizePx}px`,
    '--aura-ui-title-size': `${Math.round(24 * profile.preferences.textScale * 10) / 10}px`,
  } as CSSProperties;

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
          <AuraSparkIcon aria-hidden="true" className="interface-icon compact" />
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
            Personalize this page, then ask AURA to adjust, explain, or guide
            you.
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
                    ? 'Ready to personalize and guide.'
                    : 'Waiting for the AURA page preload.'}
              </span>
            </div>
          </div>

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
          ) : (
            <button
              className="primary-action"
              disabled={!canAdapt}
              onClick={() => void makeThisMine()}
              type="button"
            >
              {adaptation.status === 'applying'
                ? 'Making this yours…'
                : 'Make This Mine'}
            </button>
          )}
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
                  ? 'Your presentation is active. You can return to the original at any time.'
                  : 'The original presentation is restored. Your AURA version is preserved.'
                : pageIntelligence === null
                  ? 'AURA is understanding this page before making changes.'
                  : 'Only presentation changes are applied. Page content and form values stay intact.')}
          </p>

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
                    ? 'Understanding what matters…'
                    : semanticAnalysis.status === 'ready'
                      ? semanticAnalysis.pagePurpose
                      : 'Your local presentation is active'}
                </strong>
                <p>
                  {semanticAnalysis.status === 'analyzing'
                    ? 'AURA is refining hierarchy and simplifying only validated page regions.'
                    : semanticAnalysis.status === 'ready'
                      ? semanticAnalysis.summary
                      : 'Semantic refinement is unavailable, but your reading, motion, focus, and control preferences still apply.'}
                </p>
              </div>
            </section>
          ) : null}

          <TalkToAura
            disabled={
              !pageConnectionReady ||
              pageIntelligence === null ||
              semanticAnalysis.status === 'analyzing'
            }
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
