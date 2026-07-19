import {
  CAPABILITY_DIMENSION_NAMES,
  lensStatusSchema,
  pageRepresentationSchema,
  pageScanResponseSchema,
  pageStatusSchema,
  adaptationPreferencePatchSchema,
  rescueSuggestionSchema,
  taskStatusSchema,
  type AdaptationPreferences,
  type AuraFitBreakdown,
  type CapabilityDimensions,
  type CapabilityProfile,
  type ExtensionMessage,
  type FrictionSignal,
  type PageRepresentation,
  type PageScanResult,
  type PageStatus,
  type SemanticPageAnalysis,
  type SimplifyTextResponse,
  type TaskPlan,
  type RescueSuggestion,
} from '@aura/shared';
import { useEffect, useRef, useState } from 'react';

import { Onboarding } from '../../components/onboarding/Onboarding';
import { VoiceAnswer } from '../../components/onboarding/VoiceAnswer';
import { RescueSuggestion as RescueSuggestionCard } from '../../components/rescue/RescueSuggestion';
import { createSemanticPolicy } from '../../lib/adaptation/policy-engine';
import { createAdaptationDecisions, defaultValueForPreference } from '../../lib/adaptation/decision-registry';
import { createAuraApiClient } from '../../lib/api/client';
import { createSemanticProvider, type SemanticProviderKind } from '../../lib/semantic/semantic-provider';
import { calculateAuraFit } from '../../lib/friction/aura-fit';
import { semanticFrictionSignals } from '../../lib/friction/semantic-friction';
import { personalizeFriction } from '../../lib/friction/personalized-friction';
import { validateSemanticAnalysisForPage } from '../../lib/page/semantic-validation';
import {
  clearAllExplicitPreferences,
  clearExplicitPreference,
  materializeResolvedProfile,
  resolveAdaptationPreferences,
  setExplicitPreference,
  setExplicitPreferenceValue,
  type PreferenceSource,
} from '../../lib/profile/preference-resolver';
import { createProfileStore, type ProfileState } from '../../lib/profile/profile-store';
import { getRescueEnabled, setRescueEnabled } from '../../lib/rescue/rescue-preferences';
import { requestSitePermission, removeSitePermission } from '../../lib/site/permission-manager';
import { createSitePreferenceStore, normalizeSiteOrigin } from '../../lib/site/site-preference-store';
import { createDeterministicTaskPlan, suggestedTaskGoals } from '../../lib/task/task-suggestions';
import { validateTaskPlanForPage } from '../../lib/task/task-validation';

const store = createProfileStore();
const apiClient = createAuraApiClient({ timeoutMs: 6_000 });
const siteStore = createSitePreferenceStore();
const semanticProvider = createSemanticProvider(apiClient);

type PanelView = 'page' | 'task' | 'profile';
type AdaptationUiState =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'applying_local'
  | 'analyzing_semantic'
  | 'applying_semantic'
  | 'adapted'
  | 'error';

const SEMANTIC_KINDS = new Set([
  'collapseDistractions',
  'highlightPrimaryAction',
  'clarifyAmbiguousControls',
  'simplifyText',
  'guideFormSteps',
]);

const BOOLEAN_PREFERENCES = [
  ['reduceMotion', 'Reduce animation and motion'],
  ['focusMode', 'Focus on primary content'],
  ['simplifyLanguage', 'Offer simpler wording'],
  ['enlargeTargets', 'Make controls easier to select'],
  ['stepByStepForms', 'Guide complex forms in smaller steps'],
  ['hideDistractions', 'Collapse distracting secondary content'],
  ['clarifyControls', 'Clarify ambiguous controls'],
] as const satisfies readonly [keyof AdaptationPreferences, string][];

const PREFERENCE_LABELS: Record<keyof AdaptationPreferences, string> = {
  textScale: 'Text size',
  lineSpacing: 'Line spacing',
  readingWidth: 'Reading width',
  contrast: 'Contrast',
  reduceMotion: 'Reduced motion',
  focusMode: 'Focus mode',
  simplifyLanguage: 'Simpler wording',
  enlargeTargets: 'Larger controls',
  targetSizePx: 'Minimum control size',
  stepByStepForms: 'Guided form steps',
  hideDistractions: 'Distraction reduction',
  clarifyControls: 'Clearer controls',
};

const DIMENSION_LABELS: Record<keyof CapabilityDimensions, string> = {
  visual: 'Visual information',
  auditory: 'Audio information',
  motor: 'Pointer and keyboard control',
  cognitive: 'Complex instructions and workflows',
  attention: 'Focus amid competing content',
  language: 'Complex language and terminology',
};

const FRICTION_LABELS: Record<FrictionSignal['category'], string> = {
  readability: 'Hard to read',
  interaction_target: 'Small interaction target',
  focus_navigation: 'Difficult keyboard path',
  attention_clutter: 'Competing regions',
  cognitive_workflow: 'Complex workflow',
  language_complexity: 'Complex wording',
  motion: 'Motion may distract',
  control_clarity: 'Unclear control',
  form_complexity: 'Long or complex form',
};

function adaptationLabel(kind: string): string {
  return kind.replace(/([a-z])([A-Z])/gu, '$1 $2').toLowerCase();
}

function preferenceSourceLabel(source: PreferenceSource): string {
  switch (source) {
    case 'capability':
      return 'AURA recommendation';
    case 'onboarding':
      return 'Onboarding';
    case 'calibration':
      return 'Calibration';
    case 'explicit':
      return 'My choice';
    case 'legacy':
      return 'Saved choice';
    default:
      return 'Default';
  }
}

function activeProfile(state: ProfileState): CapabilityProfile | undefined {
  return state.profiles.find(({ id }) => id === state.activeProfileId);
}

function fitColor(score: number): string {
  if (score >= 85) return 'fit-good';
  if (score >= 70) return 'fit-mid';
  return 'fit-needs-work';
}

function frictionSignals(scan: PageScanResult | undefined): FrictionSignal[] {
  return scan ? [...scan.localSignals, ...scan.semanticSignals] : [];
}

function addSemanticSignals(
  scan: PageScanResult,
  semanticSignals: FrictionSignal[],
  profile: CapabilityProfile,
): PageScanResult {
  const resolution = resolveAdaptationPreferences(profile);
  const allSignals = [...scan.localSignals, ...semanticSignals];
  return {
    ...scan,
    semanticSignals,
    fit: calculateAuraFit(
      personalizeFriction(allSignals, { ...profile, preferences: resolution.preferences }),
    ),
    scannedAt: new Date().toISOString(),
  };
}

function fitDelta(original: PageScanResult | undefined, adapted: PageScanResult | undefined): number | undefined {
  if (!original || !adapted) return undefined;
  return adapted.fit.score - original.fit.score;
}

function progressSteps(state: AdaptationUiState): Array<{ label: string; done: boolean; active: boolean }> {
  const order: Array<[AdaptationUiState, string]> = [
    ['scanning', 'Scan page'],
    ['applying_local', 'Apply local adaptations'],
    ['analyzing_semantic', 'Check optional semantic help'],
    ['applying_semantic', 'Apply semantic adaptations'],
    ['adapted', 'Recheck AURA Fit'],
  ];
  const activeIndex = order.findIndex(([value]) => value === state);
  return order.map(([value, label], index) => ({
    label,
    done: state === 'adapted' || (activeIndex >= 0 && index < activeIndex),
    active: value === state,
  }));
}

export function App() {
  const [profileState, setProfileState] = useState<ProfileState>();
  const [draft, setDraft] = useState<CapabilityProfile>();
  const [status, setStatus] = useState('Loading local profiles…');
  const [profileBusy, setProfileBusy] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [view, setView] = useState<PanelView>('page');
  const [pageState, setPageState] = useState<AdaptationUiState>('idle');
  const [pageStatus, setPageStatus] = useState<PageStatus>();
  const [pageScan, setPageScan] = useState<PageScanResult>();
  const [originalScan, setOriginalScan] = useState<PageScanResult>();
  const [adaptedScan, setAdaptedScan] = useState<PageScanResult>();
  const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticPageAnalysis>();
  const [semanticProviderKind, setSemanticProviderKind] = useState<SemanticProviderKind>('unavailable');
  const [isLensEnabled, setIsLensEnabled] = useState(false);
  const [selectedFrictionId, setSelectedFrictionId] = useState<string>();
  const [compareMode, setCompareMode] = useState<'original' | 'adapted'>('adapted');
  const runIdRef = useRef(0);
  const pageContextRef = useRef<{ tabId: number; key: string } | undefined>(undefined);
  const [taskGoal, setTaskGoal] = useState('');
  const [taskPlan, setTaskPlan] = useState<TaskPlan>();
  const [taskStepIndex, setTaskStepIndex] = useState(0);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskActive, setTaskActive] = useState(false);
  const [showTaskVoice, setShowTaskVoice] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([
    'Read this page',
    'Complete this form',
    'Find the main action',
  ]);
  const [rescueSuggestion, setRescueSuggestion] = useState<RescueSuggestion>();
  const [rescueEnabled, setRescueEnabledState] = useState(true);
  const [sitePreferences, setSitePreferences] = useState<Awaited<ReturnType<typeof siteStore.list>>>([]);
  const [currentOrigin, setCurrentOrigin] = useState<string>();
  const [currentSite, setCurrentSite] = useState<Awaited<ReturnType<typeof siteStore.get>>>();
  const [siteBusy, setSiteBusy] = useState(false);

  function adoptState(nextState: ProfileState, message: string) {
    setProfileState(nextState);
    const profile = activeProfile(nextState);
    setDraft(profile ? materializeResolvedProfile(profile) : undefined);
    setStatus(message);
  }

  useEffect(() => {
    let active = true;
    void store
      .getState()
      .then((state) => {
        if (!active) return;
        adoptState(state, 'Profile loaded from this browser.');
        if (state.needsOnboarding) setShowOnboarding(true);
      })
      .catch(() => {
        if (active) setStatus('AURA could not load profiles. Please try again.');
      })
      .finally(() => {
        if (active) setProfileBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshPageContext(notifyOnChange: boolean): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!active || tab?.id === undefined) return;
      const key = `${tab.id}:${tab.url ?? 'unavailable'}`;
      const previous = pageContextRef.current;
      pageContextRef.current = { tabId: tab.id, key };
      if (previous && previous.key !== key) {
        runIdRef.current += 1;
        setPageState('idle');
        setPageStatus(undefined);
        setPageScan(undefined);
        setOriginalScan(undefined);
        setAdaptedScan(undefined);
        setSemanticAnalysis(undefined);
        setIsLensEnabled(false);
        setSelectedFrictionId(undefined);
        setTaskPlan(undefined);
        setTaskStepIndex(0);
        setTaskActive(false);
        setRescueSuggestion(undefined);
        if (notifyOnChange) setStatus('The page changed. Rescan to continue safely.');
      }

      if (typeof tab.url !== 'string') {
        setCurrentOrigin(undefined);
        setCurrentSite(undefined);
        return;
      }
      try {
        const origin = normalizeSiteOrigin(tab.url);
        setCurrentOrigin(origin);
        setCurrentSite(await siteStore.get(origin));
      } catch {
        setCurrentOrigin(undefined);
        setCurrentSite(undefined);
      }
    }

    const tabsApi = browser.tabs as typeof browser.tabs & {
      onActivated?: typeof browser.tabs.onActivated;
      onUpdated?: typeof browser.tabs.onUpdated;
    };

    const onActivated: Parameters<typeof browser.tabs.onActivated.addListener>[0] = () => {
      void refreshPageContext(true);
    };
    const onUpdated: Parameters<typeof browser.tabs.onUpdated.addListener>[0] = (
      _tabId,
      changeInfo,
    ) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        void refreshPageContext(true);
      }
    };

    void refreshPageContext(false).catch(() => {
      if (active) setStatus('AURA could not refresh the current page context.');
    });
    if (!tabsApi.onActivated || !tabsApi.onUpdated) {
      return () => {
        active = false;
      };
    }
    tabsApi.onActivated.addListener(onActivated);
    tabsApi.onUpdated.addListener(onUpdated);
    return () => {
      active = false;
      tabsApi.onActivated?.removeListener(onActivated);
      tabsApi.onUpdated?.removeListener(onUpdated);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getRescueEnabled(),
      siteStore.list(),
      browser.tabs.query({ active: true, currentWindow: true }),
    ])
      .then(async ([enabled, sites, tabs]) => {
        if (!active) return;
        setRescueEnabledState(enabled);
        setSitePreferences(sites);
        const url = tabs[0]?.url;
        if (typeof url !== 'string') return;
        try {
          const origin = normalizeSiteOrigin(url);
          setCurrentOrigin(origin);
          setCurrentSite(sites.find((site) => site.origin === origin));
        } catch {
          setCurrentOrigin(undefined);
          setCurrentSite(undefined);
        }
        try {
          await sendRawPageMessage({ type: 'PAGE_RESCUE_SET', enabled }, false);
        } catch {
          // The current page may not have an injected AURA runtime yet.
        }
      })
      .catch(() => {
        if (active) setStatus('AURA loaded, but site memory is unavailable in this browser.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const runtime = browser.runtime;
    if (!runtime?.onMessage?.addListener) return undefined;
    const listener = (value: unknown) => {
      if (!value || typeof value !== 'object' || (value as { type?: unknown }).type !== 'RESCUE_SUGGESTION') return false;
      const suggestion = rescueSuggestionSchema.safeParse((value as { suggestion?: unknown }).suggestion);
      if (suggestion.success) {
        setRescueSuggestion(suggestion.data);
        setStatus('AURA noticed a possible interaction friction point.');
      }
      return false;
    };
    runtime.onMessage.addListener(listener);
    return () => runtime.onMessage.removeListener(listener);
  }, []);

  async function sendRawPageMessage(message: ExtensionMessage, injectIfMissing = true): Promise<unknown> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab is available.');
    try {
      return await browser.tabs.sendMessage(tab.id, message);
    } catch {
      if (!injectIfMissing) throw new Error('The analyzed page is no longer available.');
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/adaptive.js'],
      });
      return browser.tabs.sendMessage(tab.id, message);
    }
  }

  async function sendStatusMessage(message: ExtensionMessage, injectIfMissing = true): Promise<PageStatus> {
    return pageStatusSchema.parse(await sendRawPageMessage(message, injectIfMissing));
  }

  async function scanCurrentPage(profile: CapabilityProfile, updateState = true): Promise<PageScanResult> {
    if (updateState) setPageState('scanning');
    try {
      const result = pageScanResponseSchema.parse(
        await sendRawPageMessage({ type: 'PAGE_SCAN', profile }),
      );
      try {
        await sendRawPageMessage({ type: 'PAGE_RESCUE_SET', enabled: rescueEnabled }, false);
      } catch {
        // The scan result remains useful even if the optional Rescue sync fails.
      }
      setPageScan(result);
      if (updateState) setPageState('ready');
      return result;
    } catch (error) {
      if (updateState) {
        setPageState('error');
        setStatus(
          error instanceof Error && error.message === 'No active tab is available.'
            ? 'Open a normal website tab to scan it with AURA.'
            : 'AURA could not scan this page. Try again from a normal website tab.',
        );
      }
      throw error;
    }
  }

  async function saveProfile() {
    if (!draft) return;
    setProfileBusy(true);
    try {
      const state = await store.saveProfile({
        ...materializeResolvedProfile(draft),
        updatedAt: new Date().toISOString(),
      });
      adoptState(state, 'Profile preferences saved locally.');
    } catch {
      setStatus('Check the profile values and try saving again.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function selectProfile(profileId: string) {
    setPageScan(undefined);
    setOriginalScan(undefined);
    setAdaptedScan(undefined);
    setPageStatus(undefined);
    setSemanticAnalysis(undefined);
    try {
      const state = await store.setActiveProfile(profileId);
      adoptState(state, 'Active profile changed. Scan the page to see its personalized Fit.');
      setPageState('idle');
    } catch {
      setStatus('AURA could not switch profiles. Please try again.');
    }
  }

  async function resetProfiles() {
    setProfileBusy(true);
    try {
      try {
        await sendStatusMessage({ type: 'PAGE_REVERT' }, false);
      } catch {
        // Resetting local profiles remains useful when the current page is unavailable.
      }
      const state = await store.resetDemoProfiles();
      setPageScan(undefined);
      setOriginalScan(undefined);
      setAdaptedScan(undefined);
      setPageStatus(undefined);
      adoptState(state, 'Demo profiles restored.');
    } catch {
      setStatus('AURA could not reset profiles. Please try again.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveDecisionPreference(
    key: keyof AdaptationPreferences,
    value: AdaptationPreferences[keyof AdaptationPreferences],
  ): Promise<CapabilityProfile | undefined> {
    if (!draft) return undefined;
    const next = setExplicitPreferenceValue(draft, key, value);
    setDraft(next);
    try {
      const state = await store.saveProfile({ ...next, updatedAt: new Date().toISOString() });
      adoptState(state, 'That decision is now an explicit profile choice.');
      return next;
    } catch {
      setStatus('AURA could not save that decision. Your current page remains unchanged.');
      return undefined;
    }
  }

  async function rememberCurrentSite(autoAdapt: boolean): Promise<void> {
    if (!currentOrigin || !resolution) {
      setStatus('Open a normal website tab and adapt it before saving site memory.');
      return;
    }
    setSiteBusy(true);
    try {
      if (autoAdapt && !(await requestSitePermission(currentOrigin))) {
        setStatus('AURA did not receive permission to auto-adapt this site.');
        return;
      }
      const saved = await siteStore.save({
        origin: currentOrigin,
        autoAdapt,
        preferencePatch: adaptationPreferencePatchSchema.parse(resolution.preferences),
      });
      const nextSites = [...sitePreferences.filter((site) => site.origin !== saved.origin), saved];
      setSitePreferences(nextSites);
      setCurrentSite(saved);
      setStatus(
        autoAdapt
          ? `AURA will adapt ${saved.origin} automatically when permission is available.`
          : `AURA saved these adaptations for ${saved.origin}.`,
      );
    } catch {
      setStatus('AURA could not save this site preference.');
    } finally {
      setSiteBusy(false);
    }
  }

  async function forgetSite(origin: string): Promise<void> {
    setSiteBusy(true);
    try {
      await siteStore.remove(origin);
      try {
        await removeSitePermission(origin);
      } catch {
        // Permission removal is best effort; the remembered preference is already gone.
      }
      setSitePreferences((sites) => sites.filter((site) => site.origin !== origin));
      setCurrentSite((site) => (site?.origin === origin ? undefined : site));
      setStatus(`AURA forgot ${origin}.`);
    } catch {
      setStatus('AURA could not remove that remembered site.');
    } finally {
      setSiteBusy(false);
    }
  }

  async function toggleRescue(enabled: boolean): Promise<void> {
    try {
      await setRescueEnabled(enabled);
      setRescueEnabledState(enabled);
      await sendRawPageMessage({ type: 'PAGE_RESCUE_SET', enabled }, false);
      setStatus(enabled ? 'AURA Rescue is on for this browser.' : 'AURA Rescue is off.');
    } catch {
      setStatus('AURA saved the Rescue setting, but could not update the current page.');
    }
  }

  async function completeOnboarding(profile: CapabilityProfile): Promise<void> {
    const state = await store.saveProfile({
      ...materializeResolvedProfile(profile),
      updatedAt: new Date().toISOString(),
    });
    adoptState(state, 'Accessible setup completed and saved locally.');
    setShowOnboarding(false);
    setView('page');
    setPageState('idle');
  }

  async function adaptPage(profileOverride?: CapabilityProfile) {
    const profile = profileOverride ?? draft;
    if (!profile) return;
    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;
    setIsLensEnabled(false);
    setSelectedFrictionId(undefined);
    setSemanticAnalysis(undefined);
    setStatus('Scanning the current page…');
    setPageState('scanning');
    try {
      if (pageStatus?.adapted) {
        await sendStatusMessage({ type: 'PAGE_REVERT' });
        setCompareMode('adapted');
      }
      const before = await scanCurrentPage(profile, false);
      if (currentRunId !== runIdRef.current) return;
      setOriginalScan(before);
      setPageState('applying_local');
      setStatus('Applying your local adaptations…');
      const localStatus = await sendStatusMessage({ type: 'PAGE_ADAPT', profile });
      setPageStatus(localStatus);
      let appliedKinds = localStatus.appliedKinds;
      try {
        await sendRawPageMessage({ type: 'PAGE_RESCUE_SET', enabled: rescueEnabled }, false);
      } catch {
        // Deterministic adaptation remains active if Rescue sync is unavailable.
      }

      const resolution = resolveAdaptationPreferences(profile);
      const wantsSemantic =
        resolution.preferences.focusMode ||
        resolution.preferences.simplifyLanguage ||
        resolution.preferences.hideDistractions ||
        resolution.preferences.clarifyControls ||
        resolution.preferences.stepByStepForms;
      let semanticSignals: FrictionSignal[] = [];

      if (wantsSemantic) {
        setPageState('analyzing_semantic');
        setStatus('Local changes are active. Checking optional semantic help…');
        try {
          const page = pageRepresentationSchema.parse(
            await sendRawPageMessage({ type: 'PAGE_SNAPSHOT_GET' }, false),
          );
          if (currentRunId !== runIdRef.current) return;
          const response = await semanticProvider.analyzePage(page);
          if (currentRunId !== runIdRef.current) return;
          const analysis = validateSemanticAnalysisForPage(response, page);
          setSemanticAnalysis(analysis);
          setSemanticProviderKind(semanticProvider.kind());
          semanticSignals = semanticFrictionSignals(analysis, page);
          const simplifications: Record<string, SimplifyTextResponse> = {};
          if (resolution.preferences.simplifyLanguage) {
            await Promise.all(
              analysis.complexTextBlocks.slice(0, 3).map(async ({ id }) => {
                const element = page.elements.find((candidate) => candidate.id === id);
                if (!element?.text || element.critical) return;
                try {
                  simplifications[id] = await semanticProvider.simplifyText({
                    text: element.text,
                    ...(page.language ? { language: page.language } : {}),
                    desiredLevel: 'simple',
                  });
                } catch {
                  // Keep the original when optional simplification is unavailable.
                }
              }),
            );
          }
          if (currentRunId !== runIdRef.current) return;
          setPageState('applying_semantic');
          setStatus('Applying optional semantic adaptations…');
          const semanticPlan = createSemanticPolicy(resolution, analysis, simplifications);
          const semanticStatus = await sendStatusMessage(
            { type: 'PAGE_SEMANTIC_APPLY', plan: semanticPlan },
            false,
          );
          setPageStatus(semanticStatus);
          appliedKinds = semanticStatus.appliedKinds;
        } catch {
          setSemanticAnalysis(undefined);
          setStatus('Local adaptations remain active. Optional semantic help was unavailable.');
        }
      }

      if (currentRunId !== runIdRef.current) return;
      setPageState('scanning');
      setStatus('Rechecking AURA Fit after adaptation…');
      const after = await scanCurrentPage(profile, false);
      const merged = addSemanticSignals(after, semanticSignals, profile);
      setPageScan(merged);
      setAdaptedScan(merged);
      setCompareMode('adapted');
      setPageState('adapted');
      setStatus(
        appliedKinds.length > 0
          ? `AURA adapted the page with ${appliedKinds.length} reversible changes.`
          : 'AURA finished scanning. No changes were needed for this profile.',
      );
    } catch {
      setPageState('error');
      setStatus('AURA could not adapt this page. Try a normal website tab and try again.');
    }
  }

  async function undoPage() {
    runIdRef.current += 1;
    setIsLensEnabled(false);
    setSelectedFrictionId(undefined);
    try {
      const next = await sendStatusMessage({ type: 'PAGE_REVERT' });
      setPageStatus(next);
      setAdaptedScan(undefined);
      if (originalScan) setPageScan(originalScan);
      setCompareMode('adapted');
      setPageState('ready');
      setStatus('All AURA page adaptations were undone.');
    } catch {
      setPageState('error');
      setStatus('AURA could not reach this page to undo adaptations.');
    }
  }

  async function loadTaskPage(): Promise<PageRepresentation> {
    const page = pageRepresentationSchema.parse(
      await sendRawPageMessage({ type: 'PAGE_SNAPSHOT_GET' }),
    );
    setTaskSuggestions(suggestedTaskGoals(page));
    return page;
  }

  async function planTaskGoal(goal = taskGoal) {
    const trimmed = goal.trim();
    if (!trimmed || taskBusy) return;
    setTaskBusy(true);
    setStatus('Understanding your task…');
    try {
      const page = await loadTaskPage();
      let plan: TaskPlan;
      try {
        plan = validateTaskPlanForPage(
          await apiClient.planTask({ page, goal: trimmed }),
          page,
        );
        setStatus('Task plan ready. AURA will guide the original page controls.');
      } catch {
        plan = createDeterministicTaskPlan(page, trimmed);
        setStatus('Using a local task plan. AURA will guide the original page controls.');
      }
      setTaskGoal(trimmed);
      setTaskPlan(plan);
      setTaskStepIndex(0);
      setTaskActive(false);
    } catch {
      setStatus('AURA could not read this page for Task Mode. Scan or adapt a normal website tab first.');
    } finally {
      setTaskBusy(false);
    }
  }

  async function startTask() {
    if (!taskPlan) return;
    try {
      taskStatusSchema.parse(
        await sendRawPageMessage({ type: 'PAGE_TASK_APPLY', plan: taskPlan }, false),
      );
      setTaskActive(true);
      setTaskStepIndex(0);
      setStatus('Guided mode is active. AURA will highlight each original control without activating it.');
    } catch {
      setStatus('AURA could not start guided mode for this page.');
    }
  }

  async function chooseTaskStep(index: number) {
    if (!taskPlan) return;
    const step = taskPlan.steps[index];
    if (!step) return;
    try {
      taskStatusSchema.parse(
        await sendRawPageMessage({ type: 'PAGE_TASK_STEP_SET', stepId: step.id }, false),
      );
      setTaskStepIndex(index);
    } catch {
      setStatus('That task step is no longer available. Rescan the page.');
    }
  }

  async function stopTask() {
    try {
      taskStatusSchema.parse(
        await sendRawPageMessage({ type: 'PAGE_TASK_REVERT' }, false),
      );
      setTaskActive(false);
      setStatus('Guided mode stopped. The original page controls are unchanged.');
    } catch {
      setTaskActive(false);
      setStatus('Guided mode stopped in AURA. The page may have navigated.');
    }
  }

  function acceptRescue() {
    const suggestion = rescueSuggestion;
    if (!suggestion || !draft) return;
    const key = suggestion.recommendationKey as keyof AdaptationPreferences;
    const next = setExplicitPreferenceValue(draft, key, true);
    setDraft(next);
    setRescueSuggestion(undefined);
    setStatus('AURA applied this Rescue suggestion for the current page. Use “Keep this” in Why these changes? to save it to your profile.');
    void adaptPage(next);
  }

  async function dismissRescue() {
    const suggestion = rescueSuggestion;
    setRescueSuggestion(undefined);
    if (!suggestion) return;
    try {
      await sendRawPageMessage({ type: 'PAGE_RESCUE_DISMISS', suggestionId: suggestion.id }, false);
    } catch {
      // The page may have navigated; dismissal is local to this panel either way.
    }
  }

  async function setCompare(nextMode: 'original' | 'adapted') {
    if (!pageStatus?.adapted && !adaptedScan) return;
    try {
      const next = await sendStatusMessage({ type: 'PAGE_COMPARE_SET', mode: nextMode }, false);
      setPageStatus(next);
      setCompareMode(nextMode);
      if (nextMode === 'original') {
        setIsLensEnabled(false);
        setStatus('Showing the original page. Your AURA changes are preserved.');
      } else {
        setStatus('Showing the AURA version again.');
      }
    } catch {
      setStatus('AURA could not switch the page comparison view.');
    }
  }

  async function toggleLens(enabled: boolean) {
    if (compareMode === 'original') return;
    const scan = adaptedScan ?? pageScan;
    if (!scan) return;
    try {
      const next = lensStatusSchema.parse(
        await sendRawPageMessage({
          type: 'PAGE_LENS_SET',
          enabled,
          signals: frictionSignals(scan),
        }, false),
      );
      setIsLensEnabled(next.enabled);
      setSelectedFrictionId(next.selectedFrictionId);
      setStatus(next.enabled ? 'AURA Lens is showing likely friction points on the page.' : 'AURA Lens is off.');
    } catch {
      setStatus('AURA Lens could not reach this page.');
    }
  }

  async function selectFriction(id: string) {
    try {
      const next = lensStatusSchema.parse(
        await sendRawPageMessage({ type: 'PAGE_LENS_SELECT', frictionId: id }, false),
      );
      setSelectedFrictionId(next.selectedFrictionId);
    } catch {
      setStatus('That friction point is no longer available. Rescan the page.');
    }
  }

  function updatePreference<Key extends keyof AdaptationPreferences>(
    key: Key,
    value: AdaptationPreferences[Key],
  ) {
    setDraft((current) => (current ? setExplicitPreference(current, key, value) : current));
  }

  function resetPreference(key: keyof AdaptationPreferences) {
    setDraft((current) => (current ? clearExplicitPreference(current, key) : current));
  }

  function resetAllExplicitPreferences() {
    setDraft((current) => (current ? clearAllExplicitPreferences(current) : current));
  }

  function updateDimension(name: keyof CapabilityDimensions, capacity: number) {
    setDraft((current) =>
      current
        ? materializeResolvedProfile({
            ...current,
            dimensions: {
              ...current.dimensions,
              [name]: { capacity, confidence: 1, sources: ['explicit_preference'] },
            },
          })
        : current,
    );
  }

  const resolution = draft ? resolveAdaptationPreferences(draft) : undefined;
  const explainedPreferences = resolution
    ? (Object.keys(resolution.preferences) as Array<keyof AdaptationPreferences>).filter(
        (key) => resolution.sources[key] !== 'default',
      )
    : [];
  const hasExplicitChoices = resolution
    ? Object.values(resolution.sources).some((source) => source === 'explicit')
    : false;
  const visibleScan = compareMode === 'original' ? originalScan : adaptedScan ?? pageScan;
  const allFriction = frictionSignals(visibleScan);
  const delta = fitDelta(originalScan, adaptedScan);
  const active = profileState ? activeProfile(profileState) : undefined;

  function preferenceMeta(key: keyof AdaptationPreferences) {
    if (!resolution) return null;
    const source = resolution.sources[key];
    return (
      <div className="inline-actions">
        <span className="local-badge">{preferenceSourceLabel(source)}</span>
        {source === 'explicit' ? (
          <button className="text-button" type="button" onClick={() => resetPreference(key)}>
            Use AURA recommendation
          </button>
        ) : null}
      </div>
    );
  }

  function renderFitCard(fit: AuraFitBreakdown) {
    return (
      <div className="fit-card">
        <div className={`fit-score ${fitColor(fit.score)}`} aria-label={`AURA Fit ${fit.score} out of 100`}>
          <strong>{fit.score}</strong>
          <span>/ 100</span>
        </div>
        <div>
          <p className="section-kicker">AURA Fit</p>
          <h3>{fit.label}</h3>
          <p className="help-text">A personalized heuristic for this profile and page, not a compliance score.</p>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (!resolution) return null;
    const progress = progressSteps(pageState);
    const topCategories = visibleScan?.fit.categories.slice(0, 3) ?? [];
    const selectedIndex = allFriction.findIndex(({ id }) => id === selectedFrictionId);
    const canNavigateFriction = allFriction.length > 1;
    const decisions = pageStatus?.plan && resolution
      ? createAdaptationDecisions(pageStatus.plan, resolution)
      : [];
    return (
      <div className="page-view">
        <section className="card page-hero" aria-labelledby="page-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Current page</p>
              <h2 id="page-heading">See where AURA can help</h2>
            </div>
            {active ? <span className="profile-chip">{active.name}</span> : null}
          </div>
          <p className="help-text">AURA scans locally first. The scan stays in this browser and does not require the backend.</p>
          {visibleScan ? renderFitCard(visibleScan.fit) : null}
          {topCategories.length > 0 ? (
            <div className="friction-summary" aria-label="Top friction categories">
              <p className="section-kicker">Likely friction for this profile</p>
              {topCategories.map((category) => (
                <div className="summary-row" key={category.category}>
                  <span>{FRICTION_LABELS[category.category]}</span>
                  <span>{category.signalCount} point{category.signalCount === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          ) : null}
          {pageState === 'error' ? <p className="error-message" role="alert">{status}</p> : null}
          <div className="actions">
            <button className="primary" type="button" disabled={!draft || pageState === 'scanning' || pageState === 'applying_local' || pageState === 'analyzing_semantic' || pageState === 'applying_semantic'} onClick={() => draft && void scanCurrentPage(draft)}>
              {visibleScan ? 'Rescan page' : 'Scan this page'}
            </button>
            <button className="primary" type="button" disabled={!draft || !visibleScan || pageState === 'scanning' || pageState === 'applying_local' || pageState === 'analyzing_semantic' || pageState === 'applying_semantic'} onClick={() => void adaptPage()}>
              Adapt this page
            </button>
          </div>
        </section>

        {pageState !== 'idle' && pageState !== 'ready' && pageState !== 'adapted' && pageState !== 'error' ? (
          <section className="card progress-card" aria-live="polite" aria-busy="true">
            <p className="section-kicker">Adaptation progress</p>
            <ol className="progress-list">
              {progress.map((step) => <li className={step.done ? 'done' : step.active ? 'active' : ''} key={step.label}><span aria-hidden="true">{step.done ? '✓' : step.active ? '…' : '○'}</span>{step.label}</li>)}
            </ol>
            <p className="help-text">Local changes remain useful if optional semantic support is unavailable.</p>
          </section>
        ) : null}

        {visibleScan ? (
          <section className="card" aria-labelledby="lens-heading">
            <div className="section-heading">
              <div><p className="section-kicker">Inspect</p><h2 id="lens-heading">AURA Lens</h2></div>
              <span className="local-badge">Works offline</span>
            </div>
            <p className="help-text">See the real page regions behind the Fit score. Lens adds removable markers without changing layout.</p>
            <div className="actions compact-actions">
              <button className="secondary" type="button" disabled={compareMode === 'original'} onClick={() => void toggleLens(!isLensEnabled)}>{isLensEnabled ? 'Hide friction' : 'Show friction'}</button>
              {isLensEnabled && canNavigateFriction ? <><button className="text-button" type="button" onClick={() => void selectFriction(allFriction[(selectedIndex - 1 + allFriction.length) % allFriction.length]?.id ?? allFriction[0]?.id ?? '')}>Previous</button><button className="text-button" type="button" onClick={() => void selectFriction(allFriction[(selectedIndex + 1) % allFriction.length]?.id ?? allFriction[0]?.id ?? '')}>Next</button></> : null}
            </div>
            {isLensEnabled ? (
              <ul className="friction-list">
                {allFriction.map((item, index) => <li key={item.id}><button className={item.id === selectedFrictionId ? 'friction-item selected' : 'friction-item'} type="button" onClick={() => void selectFriction(item.id)}><span className="friction-number">{index + 1}</span><span><strong>{FRICTION_LABELS[item.category]}</strong><small>{item.reason}</small></span></button></li>)}
              </ul>
            ) : null}
          </section>
        ) : null}

        {adaptedScan && originalScan ? (
          <section className="card result-card" aria-labelledby="result-heading">
            <div className="section-heading"><div><p className="section-kicker">Transform</p><h2 id="result-heading">Your page, reshaped</h2></div><span className="local-badge">Reversible</span></div>
            <div className="fit-delta"><div><span>Before</span><strong>{originalScan.fit.score}</strong></div><span className="delta-arrow">→</span><div><span>AURA</span><strong>{adaptedScan.fit.score}</strong></div>{delta !== undefined ? <span className={delta >= 0 ? 'delta-positive' : 'delta-negative'}>{delta >= 0 ? '+' : ''}{delta} Fit</span> : null}</div>
            <p className="help-text">The after score comes from a real rescan of the page after adaptation.</p>
            {pageStatus?.adapted ? <ul className="adaptation-status-list">{pageStatus.appliedKinds.map((kind) => <li key={kind}><span>{adaptationLabel(kind)}</span><span className="adaptation-kind-badge">{SEMANTIC_KINDS.has(kind) ? 'Semantic' : 'Local'}</span></li>)}</ul> : null}
            <fieldset className="compare-toggle"><legend>Compare page</legend><label><input type="radio" name="compare-mode" checked={compareMode === 'original'} onChange={() => void setCompare('original')} /> Original</label><label><input type="radio" name="compare-mode" checked={compareMode === 'adapted'} onChange={() => void setCompare('adapted')} /> AURA</label></fieldset>
            <details className="decision-details"><summary>Why these changes?</summary><ul className="decision-list">{decisions.map((decision) => <li className="decision-card" key={decision.instructionId}><div><strong>{adaptationLabel(decision.kind)}</strong><p>{decision.reason}</p><span className="local-badge">{decision.preferenceSource ? preferenceSourceLabel(decision.preferenceSource) : decision.source === 'semantic_ai' ? 'Semantic' : 'Local'}</span></div>{decision.preferenceKey ? <div className="inline-actions"><button className="text-button" type="button" onClick={() => void saveDecisionPreference(decision.preferenceKey as keyof AdaptationPreferences, resolution.preferences[decision.preferenceKey as keyof AdaptationPreferences])}>Keep this</button><button className="text-button" type="button" onClick={() => void saveDecisionPreference(decision.preferenceKey as keyof AdaptationPreferences, defaultValueForPreference(decision.preferenceKey as keyof AdaptationPreferences, resolution.preferences))}>Don&apos;t apply automatically</button></div> : null}</li>)}</ul></details>
            <button className="secondary" type="button" onClick={() => void undoPage()}>Undo all</button>
          </section>
        ) : null}
        {adaptedScan && originalScan && currentOrigin ? (
          <section className="card site-memory" aria-labelledby="remember-heading"><div className="section-heading"><div><p className="section-kicker">Persistence</p><h2 id="remember-heading">Remember this page?</h2></div><span className="local-badge">Origin only</span></div><p className="help-text">AURA stores only <strong>{currentOrigin}</strong>, not this page&apos;s path, query, text, or form values.</p>{currentSite ? <><p className="success-message">These choices are remembered for this site{currentSite.autoAdapt ? ' and auto-adapt is enabled' : ''}.</p><button className="secondary" type="button" disabled={siteBusy} onClick={() => void forgetSite(currentSite.origin)}>Remove site memory</button></> : <><p className="help-text">Always adapt asks for permission on this origin so AURA can apply deterministic changes on future visits. Other sites remain untouched.</p><div className="actions compact-actions"><button className="secondary" type="button" disabled={siteBusy} onClick={() => void rememberCurrentSite(false)}>Remember choices</button><button className="primary" type="button" disabled={siteBusy} onClick={() => void rememberCurrentSite(true)}>Always adapt this site</button></div></>}</section>
        ) : null}
        {semanticAnalysis ? <p className="help-text">{semanticProviderKind === 'on_device' ? 'On-device semantic support' : 'Optional semantic support'} found {semanticAnalysis.primaryActions.length} likely primary action(s) and {semanticAnalysis.distractions.length} secondary region(s).</p> : null}
      </div>
    );
  }

  function renderTask() {
    const currentStep = taskPlan?.steps[taskStepIndex];
    return <section className="task-view" aria-labelledby="task-heading"><section className="card"><p className="section-kicker">Guide</p><h2 id="task-heading">What are you trying to do?</h2><p className="help-text">AURA guides the original page controls and keeps every important action in your hands.</p><form onSubmit={(event) => { event.preventDefault(); void planTaskGoal(); }}><label htmlFor="task-goal">Your goal</label><textarea id="task-goal" rows={4} value={taskGoal} onChange={(event) => setTaskGoal(event.currentTarget.value)} placeholder="Try: Complete this form or find the checkout" /><div className="actions compact-actions"><button className="primary" type="submit" disabled={taskBusy || !taskGoal.trim()}>{taskBusy ? 'Planning…' : 'Plan this task'}</button><button className="secondary" type="button" onClick={() => setShowTaskVoice((value) => !value)}>{showTaskVoice ? 'Hide voice input' : 'Speak your goal'}</button></div></form>{showTaskVoice ? <VoiceAnswer onTranscript={(text) => { setTaskGoal(text); setShowTaskVoice(false); void planTaskGoal(text); }} /> : null}{taskSuggestions.length > 0 ? <div className="task-suggestions"><p className="section-kicker">Suggested tasks</p>{taskSuggestions.map((suggestion) => <button className="route-button" type="button" key={suggestion} onClick={() => { setTaskGoal(suggestion); void planTaskGoal(suggestion); }}>{suggestion}</button>)}</div> : null}</section>{taskPlan ? <section className="card" aria-labelledby="task-plan-heading"><div className="section-heading"><div><p className="section-kicker">Task detected</p><h2 id="task-plan-heading">{taskPlan.task.label}</h2></div><span className="local-badge">{taskPlan.task.kind.replace('_', ' ')}</span></div><ol className="task-steps">{taskPlan.steps.map((step, index) => <li key={step.id}><button className={index === taskStepIndex ? 'task-step selected' : 'task-step'} type="button" onClick={() => void chooseTaskStep(index)}><span>{index + 1}</span><span><strong>{step.label}</strong>{step.description ? <small>{step.description}</small> : null}{step.critical ? <small className="critical-note">Important decision stays with you.</small> : null}</span></button></li>)}</ol><p className="help-text">{taskPlan.warnings[0]}</p><div className="actions compact-actions"><button className="primary" type="button" disabled={taskActive} onClick={() => void startTask()}>{taskActive ? 'Guided mode active' : 'Start guided mode'}</button>{taskActive && currentStep ? <><button className="secondary" type="button" disabled={taskStepIndex === 0} onClick={() => void chooseTaskStep(taskStepIndex - 1)}>Previous</button><button className="secondary" type="button" disabled={taskStepIndex >= taskPlan.steps.length - 1} onClick={() => void chooseTaskStep(taskStepIndex + 1)}>Next</button><button className="secondary" type="button" onClick={() => void stopTask()}>Stop guided mode</button></> : null}</div></section> : null}</section>;
  }

  function renderProfile() {
    if (!profileState || !draft || !resolution) return <section className="card"><h2>Preparing your profiles</h2><p className="help-text">AURA stores this setup only in your browser.</p></section>;
    return <form className="profile-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
      <section className="card" aria-labelledby="profile-heading"><div className="section-heading"><div><p className="section-kicker">Profile</p><h2 id="profile-heading">Your adaptation setup</h2></div><span className="local-badge">Stored locally</span></div><label htmlFor="active-profile">Active profile</label><select id="active-profile" value={profileState.activeProfileId} disabled={profileBusy} onChange={(event) => void selectProfile(event.currentTarget.value)}>{profileState.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><label htmlFor="profile-name">Profile name</label><input id="profile-name" value={draft.name} maxLength={80} required onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} /><button className="secondary" type="button" onClick={() => setShowOnboarding(true)}>Start new accessible setup</button></section>
      <section className="card" aria-labelledby="presentation-heading"><div className="section-heading"><div><p className="section-kicker">Preferences</p><h2 id="presentation-heading">Reading preferences</h2></div></div><label htmlFor="text-scale">Text size <output>{Math.round(draft.preferences.textScale * 100)}%</output></label><input id="text-scale" type="range" min="1" max="2" step="0.1" value={draft.preferences.textScale} onChange={(event) => updatePreference('textScale', event.currentTarget.valueAsNumber)} />{preferenceMeta('textScale')}<label htmlFor="line-spacing">Line spacing <output>{draft.preferences.lineSpacing.toFixed(1)}×</output></label><input id="line-spacing" type="range" min="1" max="2.5" step="0.1" value={draft.preferences.lineSpacing} onChange={(event) => updatePreference('lineSpacing', event.currentTarget.valueAsNumber)} />{preferenceMeta('lineSpacing')}<label htmlFor="reading-width">Reading width</label><select id="reading-width" value={draft.preferences.readingWidth} onChange={(event) => updatePreference('readingWidth', event.currentTarget.value as AdaptationPreferences['readingWidth'])}><option value="normal">Normal</option><option value="narrow">Narrow</option><option value="very_narrow">Very narrow</option></select>{preferenceMeta('readingWidth')}<label htmlFor="contrast">Contrast</label><select id="contrast" value={draft.preferences.contrast} onChange={(event) => updatePreference('contrast', event.currentTarget.value as AdaptationPreferences['contrast'])}><option value="default">Keep site colors</option><option value="enhanced">Enhanced contrast</option></select>{preferenceMeta('contrast')}</section>
      <fieldset className="card choice-list"><legend>Adaptation preferences</legend>{BOOLEAN_PREFERENCES.map(([key, label]) => <div key={key}><label className="check-row"><input type="checkbox" checked={Boolean(draft.preferences[key])} onChange={(event) => updatePreference(key, event.currentTarget.checked)} /><span>{label}</span></label>{preferenceMeta(key)}</div>)}<label htmlFor="target-size">Minimum control size <output>{draft.preferences.targetSizePx}px</output></label><input id="target-size" type="range" min="32" max="72" step="4" disabled={!draft.preferences.enlargeTargets} value={draft.preferences.targetSizePx} onChange={(event) => updatePreference('targetSizePx', event.currentTarget.valueAsNumber)} />{preferenceMeta('targetSizePx')}</fieldset>
      <details className="card capability-details"><summary>Advanced capability signals</summary><p className="help-text">These are product signals, not medical measurements or a diagnosis.</p>{CAPABILITY_DIMENSION_NAMES.map((name) => <div className="dimension" key={name}><label htmlFor={`dimension-${name}`}>Comfort relying on {DIMENSION_LABELS[name].toLowerCase()} <output>{Math.round(draft.dimensions[name].capacity * 100)}%</output></label><input id={`dimension-${name}`} type="range" min="0" max="1" step="0.05" value={draft.dimensions[name].capacity} onChange={(event) => updateDimension(name, event.currentTarget.valueAsNumber)} /></div>)}</details>
      <details className="card capability-details"><summary>Why AURA recommends these settings</summary><p className="help-text">Capability recommendations are the lowest-priority suggestions. Onboarding, calibration, and your manual choices override them.</p><ul className="summary-list">{explainedPreferences.map((key) => <li key={key}><strong>{PREFERENCE_LABELS[key]}:</strong> {preferenceSourceLabel(resolution.sources[key])}. {resolution.reasons[key] ?? 'Resolved from your accessibility profile.'}</li>)}</ul>{hasExplicitChoices ? <button className="secondary" type="button" onClick={resetAllExplicitPreferences}>Use AURA recommendations for all manual choices</button> : null}</details>
      <section className="card site-memory" aria-labelledby="memory-heading"><div className="section-heading"><div><p className="section-kicker">Trust & control</p><h2 id="memory-heading">Rescue and site memory</h2></div><span className="local-badge">Stored locally</span></div><label className="check-row"><input type="checkbox" checked={rescueEnabled} onChange={(event) => void toggleRescue(event.currentTarget.checked)} /><span>Offer AURA Rescue suggestions</span></label><p className="help-text">Rescue only suggests a reversible change. It never changes the page without your consent.</p>{sitePreferences.length > 0 ? <ul className="site-list">{sitePreferences.map((site) => <li key={site.origin}><span><strong>{site.origin}</strong><small>{site.autoAdapt ? 'Always adapt is on' : 'Remembered choices only'}</small></span><button className="text-button" type="button" disabled={siteBusy} onClick={() => void forgetSite(site.origin)}>Remove</button></li>)}</ul> : <p className="help-text">No sites are remembered yet.</p>}</section>
      <div className="actions"><button className="primary" type="submit" disabled={profileBusy}>Save profile</button><button className="secondary" type="button" disabled={profileBusy} onClick={() => void resetProfiles()}>Reset demo profiles</button></div>
    </form>;
  }

  return <main className="shell"><header className="masthead"><p className="eyebrow">Adaptive User-Responsive Accessibility</p><h1>AURA</h1><p className="lede">A personal accessibility layer for the web.</p></header><p className="notice" role="status" aria-live="polite">{status}</p>{showOnboarding ? <Onboarding onCancel={() => { setShowOnboarding(false); setView('profile'); }} onComplete={completeOnboarding} /> : profileState && draft ? <><nav className="primary-nav" aria-label="AURA sections"><button className={view === 'page' ? 'nav-tab active' : 'nav-tab'} type="button" onClick={() => setView('page')}>Page</button><button className={view === 'task' ? 'nav-tab active' : 'nav-tab'} type="button" onClick={() => setView('task')}>Task</button><button className={view === 'profile' ? 'nav-tab active' : 'nav-tab'} type="button" onClick={() => setView('profile')}>Profile</button></nav>{rescueSuggestion ? <RescueSuggestionCard suggestion={rescueSuggestion} onAccept={() => void acceptRescue()} onDismiss={() => void dismissRescue()} /> : null}{view === 'page' ? renderPage() : view === 'task' ? renderTask() : renderProfile()}</> : <section className="card" aria-busy={profileBusy}><h2>Preparing your profiles</h2><p className="help-text">AURA stores this setup only in your browser.</p></section>}</main>;
}
