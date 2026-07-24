import {
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
import { LearnMe } from './LearnMe';

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
  const [profile, setProfile] = useState<BrowserProfile | null | undefined>(
    undefined,
  );
  const editingAddress = useRef(false);
  const navigationInProgress = useRef(false);

  useEffect(() => {
    const removeNavigationListener = window.aura.onNavigationState((state) => {
      setNavigation(state);
      if (
        (state.isLoading && !navigationInProgress.current) ||
        state.error !== null
      ) {
        setRuntimeEvent(null);
      }
      navigationInProgress.current = state.isLoading;
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
    void window.aura.getPageIntelligenceState().then(setPageIntelligence);
    void window.aura.getAdaptationState().then(setAdaptation);

    return () => {
      removeAdaptationListener();
      removeIntelligenceListener();
      removeNavigationListener();
      removeRuntimeListener();
    };
  }, []);

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
        <span className="brand-mark" aria-hidden="true">A</span>
        <p>Preparing AURA…</p>
      </main>
    );
  }

  if (profile === null || profile.completedAt === null) {
    return <LearnMe initialProfile={profile ?? undefined} onComplete={completeOnboarding} />;
  }

  return (
    <main className={panelOpen ? 'shell panel-open' : 'shell'}>
      <header className="browser-chrome">
        <div className="brand" aria-label="AURA Browser">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AURA</span>
        </div>

        <nav className="navigation-controls" aria-label="Page navigation">
          <button
            aria-label="Go back"
            className="icon-button"
            disabled={!navigation.canGoBack}
            onClick={() => void window.aura.back()}
            type="button"
          >
            ←
          </button>
          <button
            aria-label="Go forward"
            className="icon-button"
            disabled={!navigation.canGoForward}
            onClick={() => void window.aura.forward()}
            type="button"
          >
            →
          </button>
          <button
            aria-label="Refresh page"
            className="icon-button"
            onClick={() => void window.aura.refresh()}
            type="button"
          >
            ↻
          </button>
        </nav>

        <form className="address-form" onSubmit={submitAddress}>
          <span
            className={navigation.isLoading ? 'load-dot active' : 'load-dot'}
            aria-hidden="true"
          />
          <input
            aria-label="Search or enter address"
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
          className="aura-toggle"
          onClick={togglePanel}
          type="button"
        >
          <span aria-hidden="true">✦</span>
          {panelOpen ? 'Close AURA' : 'Open AURA'}
        </button>
      </header>

      {panelOpen ? (
        <aside className="aura-panel" aria-label="AURA panel">
          <div className="panel-header">
            <div className="panel-symbol" aria-hidden="true">
              ✦
            </div>
            <div>
              <p className="eyebrow">AURA</p>
              <h1>Ready for this page.</h1>
            </div>
          </div>

          <p className="panel-copy">
            Your profile is ready. Make This Mine applies your reading,
            interaction, focus, and motion preferences to this page.
          </p>

          <div className="profile-card">
            <p className="eyebrow">Your comfort profile</p>
            <p>{profile.summary}</p>
            {profile.learnedPreferences.map((preference) => (
              <span key={preference}>{preference}</span>
            ))}
            <button onClick={() => void restartOnboarding()} type="button">
              Re-run Learn Me
            </button>
          </div>

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
                    ? `${runtimeEvent.phase} · ${runtimeEvent.readyState}`
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

          {import.meta.env.DEV && pageIntelligence !== null ? (
            <details className="page-model-inspector">
              <summary>PageModel inspector</summary>
              <dl>
                <div>
                  <dt>Revision</dt>
                  <dd>{pageIntelligence.model.revision}</dd>
                </div>
                <div>
                  <dt>Targets</dt>
                  <dd>
                    {pageIntelligence.model.elements.length} /{' '}
                    {pageIntelligence.model.metrics.candidateCount}
                  </dd>
                </div>
                <div>
                  <dt>Capture</dt>
                  <dd>
                    {pageIntelligence.model.metrics.captureDurationMs} ms
                  </dd>
                </div>
                <div>
                  <dt>Screenshot</dt>
                  <dd>{pageIntelligence.screenshot.status}</dd>
                </div>
                <div>
                  <dt>Health</dt>
                  <dd>{pageIntelligence.model.extractionHealth.score}</dd>
                </div>
              </dl>
              <div className="page-model-targets">
                {pageIntelligence.model.elements.slice(0, 8).map((element) => (
                  <button
                    key={element.auraId}
                    onClick={() => {
                      void window.aura.debugPageTarget({
                        auraId: element.auraId,
                        pageId: pageIntelligence.model.pageId,
                        revision: pageIntelligence.model.revision,
                        type: 'highlight-target',
                      });
                    }}
                    type="button"
                  >
                    <span>{element.category}</span>
                    {element.accessibleName ?? element.text ?? element.tag}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}
