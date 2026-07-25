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
  compareWcagScans,
  type WcagScanResult,
} from '../shared/wcag';
import { calculateAuraFit } from '../shared/aura-fit';
import {
  AuraBrand,
  AuraGuide,
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
      selectedTargetCount: number;
      status: 'fallback' | 'matched' | 'ready';
    };

interface WcagEvidenceState {
  baseline: WcagScanResult | null;
  error: string | null;
  result: WcagScanResult | null;
  status: 'idle' | 'running' | 'ready';
}

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
  const [wcagScan, setWcagScan] = useState<WcagEvidenceState>({
    baseline: null,
    error: null,
    result: null,
    status: 'idle',
  });
  const editingAddress = useRef(false);
  const lastPageId = useRef<string | null>(null);
  const localRecomposeRequest = useRef(0);
  const afterScanPending = useRef(false);

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
      afterScanPending.current = false;
      setWcagScan({
        baseline: null,
        error: null,
        result: null,
        status: 'idle',
      });
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
    if (
      wcagScan.baseline === null ||
      wcagScan.baseline.pageUrl !== model.url
    ) {
      setWcagScan((current) => ({
        ...current,
        error: null,
        status: 'running',
      }));
      try {
        const baseline = await window.aura.scanPage();
        setWcagScan({
          baseline,
          error: null,
          result: baseline,
          status: 'ready',
        });
      } catch {
        setWcagScan((current) => ({
          ...current,
          error: 'AURA could not capture the original accessibility evidence.',
          status: current.result === null ? 'idle' : 'ready',
        }));
      }
    }
    afterScanPending.current = true;
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
        selectedTargetCount: 0,
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
          selectedTargetCount: 0,
          status: 'fallback',
        });
        return;
      }
      setLocalRecompose({
        durationMs: result.durationMs,
        error: result.error,
        model: result.model,
        selectedTargetCount:
          result.output === null
            ? 0
            : new Set([
                ...result.output.primaryTargetIds,
                ...result.output.resultTargetIds,
                ...result.output.supportingTargetIds,
              ]).size,
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

  async function scanPage(): Promise<void> {
    setWcagScan((current) => ({
      ...current,
      error: null,
      status: 'running',
    }));
    try {
      const result = await window.aura.scanPage();
      setWcagScan((current) => ({
        baseline:
          adaptation.view === 'original' || current.baseline === null
            ? result
            : current.baseline,
        error: null,
        result,
        status: 'ready',
      }));
    } catch (caughtError) {
      setWcagScan((current) => ({
        ...current,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : 'The page scan failed.',
        status: current.result === null ? 'idle' : 'ready',
      }));
    }
  }

  useEffect(() => {
    if (
      !afterScanPending.current ||
      adaptation.status !== 'ready' ||
      adaptation.view !== 'aura' ||
      localRecompose.status === 'running' ||
      semanticAnalysis.status === 'analyzing'
    ) {
      return;
    }
    afterScanPending.current = false;
    setWcagScan((current) => ({ ...current, error: null, status: 'running' }));
    void window.aura
      .scanPage()
      .then((result) => {
        setWcagScan((current) => ({
          ...current,
          error: null,
          result,
          status: 'ready',
        }));
      })
      .catch(() => {
        setWcagScan((current) => ({
          ...current,
          error: 'The adapted page is ready, but its follow-up scan failed.',
          status: current.result === null ? 'idle' : 'ready',
        }));
      });
  }, [
    adaptation.status,
    adaptation.view,
    localRecompose.status,
    semanticAnalysis.status,
  ]);

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
    '--aura-ui-body-size': `${Math.round(16 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-leading': profile.preferences.lineSpacing,
    '--aura-ui-section-title-size': `${Math.round(20 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-small-size': `${Math.round(14 * profile.preferences.textScale * 10) / 10}px`,
    '--aura-ui-target': `${Math.max(48, profile.preferences.targetSizePx)}px`,
    '--aura-ui-title-size': `${Math.round(24 * profile.preferences.textScale * 10) / 10}px`,
  } as CSSProperties;

  const selectedTargetCount =
    localRecompose.status === 'ready' ||
    localRecompose.status === 'matched' ||
    localRecompose.status === 'fallback'
      ? localRecompose.selectedTargetCount
      : 0;
  const localStatusCopy =
    localRecompose.status === 'running'
      ? 'Choosing the most useful content and controls on this Mac…'
      : localRecompose.status === 'ready'
        ? `AURA selected ${localRecompose.selectedTargetCount} relevant page elements and reorganized them into a clearer experience.`
      : localRecompose.status === 'matched'
          ? 'The first AURA layout already matched your profile, so no extra rearrangement was needed.'
          : localRecompose.status === 'fallback'
            ? 'AURA’s immediate page structure is active. Optional model refinements are explained below.'
            : null;
  const localIntelligenceCopy =
    localRecompose.status === 'running'
      ? 'Working with the ranked page elements now.'
      : localRecompose.status === 'ready'
        ? `Applied a validated plan using ${selectedTargetCount} real page targets.`
        : localRecompose.status === 'matched'
          ? 'Returned a valid plan, but the immediate AURA layout already matched it.'
          : localRecompose.status === 'fallback'
            ? localRecompose.error ??
              'No validated on-device refinement was available.'
            : 'Starts when you choose Make This Mine.';
  const cloudIntelligenceCopy =
    semanticAnalysis.status === 'analyzing'
      ? 'Reading the page purpose, screenshot, and your profile.'
      : semanticAnalysis.status === 'ready'
        ? `Applied ${semanticAnalysis.appliedCount} validated semantic change${semanticAnalysis.appliedCount === 1 ? '' : 's'}.`
        : semanticAnalysis.status === 'fallback'
          ? semanticAnalysis.error ??
            'No validated cloud refinement was available.'
          : 'Starts with the personalized presentation.';
  const wcagComparison =
    wcagScan.baseline !== null &&
    wcagScan.result !== null &&
    wcagScan.baseline.scannedAt !== wcagScan.result.scannedAt
      ? compareWcagScans(wcagScan.baseline, wcagScan.result)
      : null;
  const fitProfile = profileForRecomposePreset(
    profile,
    appliedPreset ?? selectedPreset,
  );
  const baselineFit =
    wcagScan.baseline === null || pageIntelligence === null
      ? null
      : calculateAuraFit({
          adaptation: null,
          page: pageIntelligence.model,
          profile: fitProfile,
          scan: wcagScan.baseline,
        });
  const currentFit =
    wcagScan.result === null || pageIntelligence === null
      ? null
      : calculateAuraFit({
          adaptation:
            wcagComparison === null
              ? null
              : {
                  active: true,
                  changedTargetCount: adaptation.changedTargetCount,
                  localSelectedTargetCount: selectedTargetCount,
                  preset: appliedPreset ?? selectedPreset,
                  semanticAppliedCount: semanticAnalysis.appliedCount,
                },
          page: pageIntelligence.model,
          profile: fitProfile,
          scan: wcagScan.result,
        });
  const fitDelta =
    baselineFit === null || currentFit === null
      ? null
      : currentFit.score - baselineFit.score;
  const mostImportantFitDimensions =
    currentFit === null
      ? []
      : [...currentFit.dimensions]
          .sort(
            (left, right) =>
              left.score / left.maximum - right.score / right.maximum,
          )
          .slice(0, 3);

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
            <div className="panel-guide" aria-hidden="true">
              <AuraGuide
                mood={
                  semanticAnalysis.status === 'analyzing' ||
                  conversation.status !== 'idle'
                    ? 'thinking'
                    : 'guiding'
                }
              />
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

          <section className="scan-card" aria-labelledby="scan-title">
            <div className="scan-heading">
              <div>
                <p className="eyebrow">Accessibility evidence</p>
                <h2 id="scan-title">Scan this page</h2>
              </div>
              {wcagScan.result !== null ? (
                <span
                  className={
                    wcagScan.result.failedRules === 0
                      ? 'standards-status clear'
                      : 'standards-status issues'
                  }
                >
                  {wcagScan.result.failedRules === 0
                    ? 'No automated failures'
                    : `${wcagScan.result.failedRules} automated failure${wcagScan.result.failedRules === 1 ? '' : 's'}`}
                </span>
              ) : null}
            </div>
            <button
              className="secondary-action scan-button"
              disabled={
                !pageConnectionReady ||
                navigation.isLoading ||
                wcagScan.status === 'running'
              }
              onClick={() => void scanPage()}
              type="button"
            >
              {wcagScan.status === 'running'
                ? 'Scanning page…'
                : wcagScan.result !== null
                  ? 'Scan again'
                  : 'Scan this page'}
            </button>
            {wcagScan.result !== null ? (
              <>
                {currentFit === null ? null : (
                  <div className="aura-fit-card">
                    <div className="aura-fit-heading">
                      <div>
                        <p className="eyebrow">Personalized AURA Fit</p>
                        <strong>How this page works for this profile</strong>
                      </div>
                      <div
                        aria-label={`AURA Fit ${currentFit.score} out of 100`}
                        className="aura-fit-score"
                      >
                        {wcagComparison === null || baselineFit === null ? null : (
                          <>
                            <span>{baselineFit.score}</span>
                            <span aria-hidden="true">→</span>
                          </>
                        )}
                        <strong>{currentFit.score}</strong>
                        <small>/100</small>
                        {fitDelta === null || wcagComparison === null ? null : (
                          <span
                            className={
                              fitDelta >= 0
                                ? 'aura-fit-delta improved'
                                : 'aura-fit-delta regressed'
                            }
                          >
                            {fitDelta >= 0 ? '+' : ''}
                            {fitDelta}
                          </span>
                        )}
                      </div>
                    </div>
                    <p>
                      This is an explainable AURA heuristic—not a WCAG
                      conformance score. It combines standards evidence, page
                      structure, and this person’s six-area support profile.
                    </p>
                    <ul className="fit-key-reasons">
                      {mostImportantFitDimensions.map((dimension) => (
                        <li key={dimension.id}>
                          <strong>
                            {dimension.label}: {dimension.score}/
                            {dimension.maximum}
                          </strong>
                          <span>{dimension.findings[0]}</span>
                        </li>
                      ))}
                    </ul>
                    <details className="fit-details">
                      <summary>See the full AURA Fit breakdown</summary>
                      <div className="fit-dimensions">
                        {currentFit.dimensions.map((dimension) => (
                          <div className="fit-dimension" key={dimension.id}>
                            <div>
                              <strong>{dimension.label}</strong>
                              <span>
                                {dimension.score}/{dimension.maximum}
                              </span>
                            </div>
                            <progress
                              aria-label={`${dimension.label} fit`}
                              max={dimension.maximum}
                              value={dimension.score}
                            />
                            {dimension.findings.map((finding) => (
                              <p key={finding}>{finding}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                    <p className="fit-confidence">
                      Evidence confidence: {currentFit.confidence}.
                      {wcagScan.result.needsReviewRules > 0
                        ? ` ${wcagScan.result.needsReviewRules} standards check${wcagScan.result.needsReviewRules === 1 ? '' : 's'} still need human review.`
                        : ' No automated check is waiting for manual resolution.'}
                    </p>
                  </div>
                )}
                <p className="scan-summary">
                  {wcagComparison === null
                    ? 'Original standards evidence: '
                    : 'Adapted presentation evidence: '}
                  {wcagScan.result.passedRules} automated checks passed,{' '}
                  {wcagScan.result.failedRules} failed, and{' '}
                  {wcagScan.result.needsReviewRules} need human review.
                </p>
                {wcagComparison !== null ? (
                  <div className="scan-comparison" aria-live="polite">
                    <strong>What changed after Make This Mine</strong>
                    {wcagComparison.resolved.length > 0 ? (
                      <ul className="scan-issues resolved">
                        {wcagComparison.resolved.slice(0, 4).map((issue) => (
                          <li key={issue.id}>
                            <strong>Resolved: {issue.help}</strong>
                            <span>
                              Previously affected {issue.nodeCount} location
                              {issue.nodeCount === 1 ? '' : 's'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        No automatically testable WCAG failures changed. AURA
                        may still have improved personal comfort and task focus.
                      </p>
                    )}
                    {wcagComparison.remaining.length > 0 ? (
                      <p>
                        {wcagComparison.remaining.length} automated issue
                        {wcagComparison.remaining.length === 1 ? '' : 's'} still
                        remain.
                      </p>
                    ) : null}
                    {wcagComparison.introduced.length > 0 ? (
                      <p className="scan-warning">
                        AURA detected {wcagComparison.introduced.length} new
                        automated issue
                        {wcagComparison.introduced.length === 1 ? '' : 's'} and
                        has not hidden that regression.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {wcagScan.result.issues.length > 0 ? (
                  <details open>
                    <summary>Standards failures found</summary>
                    <ul className="scan-issues">
                      {wcagScan.result.issues
                        .slice(0, 5)
                        .map((issue) => (
                          <li key={issue.id}>
                            <strong>{issue.help}</strong>
                            <span>
                              {issue.impact === null
                                ? 'Review'
                                : `${issue.impact[0]?.toLocaleUpperCase()}${issue.impact.slice(1)}`}
                              {' · '}
                              {issue.nodeCount} affected location
                              {issue.nodeCount === 1 ? '' : 's'}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </details>
                ) : (
                  <p className="scan-clear">
                    No failures were detected by the automated rules that ran.
                    This does not mean the page conforms to WCAG.
                  </p>
                )}
                {wcagScan.result.reviewItems.length > 0 ? (
                  <details>
                    <summary>
                      What still needs human review? (
                      {wcagScan.result.reviewItems.length})
                    </summary>
                    <ul className="scan-issues">
                      {wcagScan.result.reviewItems
                        .slice(0, 4)
                        .map((issue) => (
                          <li key={issue.id}>
                            <strong>{issue.help}</strong>
                            <span>
                              {issue.nodeCount} location
                              {issue.nodeCount === 1 ? '' : 's'} to inspect
                            </span>
                          </li>
                        ))}
                    </ul>
                  </details>
                ) : null}
                {wcagScan.result.issues.some((issue) =>
                  issue.areas.some(
                    (area) => profile.capabilities[area] !== 'default',
                  ),
                ) ? (
                  <p className="profile-relevance">
                    Some findings overlap with your visual, interaction,
                    attention, or comprehension preferences, so AURA prioritizes
                    those explanations. Your profile never changes the number.
                  </p>
                ) : null}
                <p className="scan-limit">
                  Automated WCAG evidence is not certification or a conformance
                  decision. Human testing is required, and Original remains the
                  source website.
                </p>
              </>
            ) : (
              <p className="scan-summary">
                Check automatically testable WCAG A/AA rules, then see which
                findings may matter most for your profile.
              </p>
            )}
            {wcagScan.error === null ? null : (
              <p className="error-message" role="alert">
                {wcagScan.error}
              </p>
            )}
          </section>

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

          {localStatusCopy !== null || semanticAnalysis.status !== 'idle' ? (
            <section
              aria-live="polite"
              className={`transformation-evidence ${semanticAnalysis.status}`}
            >
              <span aria-hidden="true">
                {semanticAnalysis.status === 'ready' ? (
                  <CheckIcon className="status-glyph" />
                ) : (
                  <AuraSparkIcon className="status-glyph" />
                )}
              </span>
              <div>
                <strong>
                  {semanticAnalysis.status === 'ready'
                    ? semanticAnalysis.pagePurpose
                    : localRecompose.status === 'running' ||
                        semanticAnalysis.status === 'analyzing'
                      ? 'Understanding what matters…'
                      : 'Your personalized page is ready'}
                </strong>
                <p>
                  {semanticAnalysis.status === 'ready'
                    ? semanticAnalysis.summary
                    : localStatusCopy ??
                      'Your adapted page remains ready while AURA finishes.'}
                </p>
                <ul className="transformation-metrics">
                  <li>
                    <strong>
                      {pageIntelligence?.model.elements.length ?? 0}
                    </strong>
                    <span>useful page elements understood</span>
                  </li>
                  {selectedTargetCount > 0 ? (
                    <li>
                      <strong>{selectedTargetCount}</strong>
                      <span>brought forward for this experience</span>
                    </li>
                  ) : null}
                  {semanticAnalysis.status === 'ready' ? (
                    <li>
                      <strong>{semanticAnalysis.appliedCount}</strong>
                      <span>
                        deeper refinements
                        {semanticAnalysis.appliedCount === 0
                          ? ' — no change was invented'
                          : ''}
                      </span>
                    </li>
                  ) : null}
                </ul>
                {conversation.currentIntent === null ? null : (
                  <p className="transformation-goal">
                    Goal kept in view: {conversation.currentIntent.goal}
                  </p>
                )}
                <details className="intelligence-details">
                  <summary>How AURA’s two AI planners contributed</summary>
                  <div className="intelligence-paths">
                    <div>
                      <span
                        aria-hidden="true"
                        className={`intelligence-state ${localRecompose.status}`}
                      />
                      <p>
                        <strong>On-device planner</strong>
                        <span>Qwen 3.5 4B · private local structure</span>
                        <small>{localIntelligenceCopy}</small>
                      </p>
                    </div>
                    <div>
                      <span
                        aria-hidden="true"
                        className={`intelligence-state ${semanticAnalysis.status}`}
                      />
                      <p>
                        <strong>Cloud semantic planner</strong>
                        <span>GPT-5.6 Luna · deeper page meaning</span>
                        <small>{cloudIntelligenceCopy}</small>
                      </p>
                    </div>
                  </div>
                </details>
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
