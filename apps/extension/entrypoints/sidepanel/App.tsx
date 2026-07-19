import {
  CAPABILITY_DIMENSION_NAMES,
  pageRepresentationSchema,
  pageStatusSchema,
  type AdaptationPreferences,
  type CapabilityDimensions,
  type CapabilityProfile,
  type ExtensionMessage,
  type PageRepresentation,
  type PageStatus,
  type SemanticPageAnalysis,
  type SimplifyTextResponse,
} from '@aura/shared';
import { useEffect, useRef, useState } from 'react';

import { Onboarding } from '../../components/onboarding/Onboarding';
import { createSemanticPolicy } from '../../lib/adaptation/policy-engine';
import { createAuraApiClient } from '../../lib/api/client';
import { validateSemanticAnalysisForPage } from '../../lib/page/semantic-validation';
import {
  clearAllExplicitPreferences,
  clearExplicitPreference,
  materializeResolvedProfile,
  resolveAdaptationPreferences,
  setExplicitPreference,
  type PreferenceSource,
} from '../../lib/profile/preference-resolver';
import {
  createProfileStore,
  type ProfileState,
} from '../../lib/profile/profile-store';

const store = createProfileStore();
const apiClient = createAuraApiClient({ timeoutMs: 6_000 });

const SEMANTIC_KINDS = new Set([
  'collapseDistractions',
  'highlightPrimaryAction',
  'clarifyAmbiguousControls',
  'simplifyText',
  'guideFormSteps',
]);

function adaptationLabel(kind: string): string {
  return kind.replace(/([a-z])([A-Z])/gu, '$1 $2').toLowerCase();
}

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

export function App() {
  const [profileState, setProfileState] = useState<ProfileState>();
  const [draft, setDraft] = useState<CapabilityProfile>();
  const [status, setStatus] = useState('Loading local profiles…');
  const [isBusy, setIsBusy] = useState(true);
  const [pageStatus, setPageStatus] = useState<PageStatus>();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticPageAnalysis>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRunRef = useRef(0);

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
        if (active) {
          adoptState(state, 'Profile loaded from this browser.');
          if (state.needsOnboarding) setShowOnboarding(true);
        }
      })
      .catch(() => {
        if (active) setStatus('AURA could not load profiles. Please try again.');
      })
      .finally(() => {
        if (active) setIsBusy(false);
      });

    return () => {
      active = false;
    };
  }, []);

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

  function updateDimension(
    name: keyof CapabilityDimensions,
    capacity: number,
  ) {
    setDraft((current) =>
      current
        ? materializeResolvedProfile({
            ...current,
            dimensions: {
              ...current.dimensions,
              [name]: {
                capacity,
                confidence: 1,
                sources: ['explicit_preference'],
              },
            },
          })
        : current,
    );
  }

  async function selectProfile(profileId: string) {
    analysisRunRef.current += 1;
    setIsAnalyzing(false);
    setSemanticAnalysis(undefined);
    setIsBusy(true);
    try {
      const state = await store.setActiveProfile(profileId);
      adoptState(state, 'Active profile changed.');
    } catch {
      setStatus('AURA could not switch profiles. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function saveProfile() {
    if (!draft) return;

    setIsBusy(true);
    try {
      const state = await store.saveProfile({
        ...materializeResolvedProfile(draft),
        updatedAt: new Date().toISOString(),
      });
      adoptState(state, 'Profile preferences saved locally.');
    } catch {
      setStatus('Check the profile values and try saving again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function resetProfiles() {
    setIsBusy(true);
    try {
      const state = await store.resetDemoProfiles();
      adoptState(state, 'Demo profiles restored.');
    } catch {
      setStatus('AURA could not reset profiles. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function completeOnboarding(profile: CapabilityProfile): Promise<void> {
    const state = await store.saveProfile({
      ...materializeResolvedProfile(profile),
      updatedAt: new Date().toISOString(),
    });
    adoptState(state, 'Accessible setup completed and saved locally.');
    setShowOnboarding(false);
  }

  async function sendRawPageMessage(
    message: ExtensionMessage,
    injectIfMissing = true,
  ): Promise<unknown> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab is available.');

    let response: unknown;
    try {
      response = await browser.tabs.sendMessage(tab.id, message);
    } catch {
      if (!injectIfMissing) throw new Error('The analyzed page is no longer available.');
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/adaptive.js'],
      });
      response = await browser.tabs.sendMessage(tab.id, message);
    }
    return response;
  }

  async function sendPageMessage(
    message: ExtensionMessage,
    injectIfMissing = true,
  ): Promise<PageStatus> {
    return pageStatusSchema.parse(await sendRawPageMessage(message, injectIfMissing));
  }

  async function getPageSnapshot(): Promise<PageRepresentation> {
    return pageRepresentationSchema.parse(
      await sendRawPageMessage({ type: 'PAGE_SNAPSHOT_GET' }, false),
    );
  }

  async function adaptPage() {
    if (!draft) return;
    const resolution = resolveAdaptationPreferences(draft);
    const runId = analysisRunRef.current + 1;
    analysisRunRef.current = runId;
    setIsAnalyzing(false);
    setIsBusy(true);
    setStatus('Applying local adaptations…');
    try {
      const next = await sendPageMessage({ type: 'PAGE_ADAPT', profile: draft });
      setPageStatus(next);
      const wantsSemanticSupport =
        resolution.preferences.focusMode ||
        resolution.preferences.simplifyLanguage ||
        resolution.preferences.hideDistractions ||
        resolution.preferences.clarifyControls ||
        resolution.preferences.stepByStepForms;
      if (!wantsSemanticSupport) {
        setSemanticAnalysis(undefined);
        setStatus(
          next.errors.length > 0
            ? 'The page adapted locally with some non-blocking limitations.'
            : 'Local adaptations applied. No backend was required.',
        );
        return;
      }
      setStatus('Local adaptations applied. Checking optional semantic support…');
      setIsAnalyzing(true);
      setIsBusy(false);
      try {
        const page = await getPageSnapshot();
        if (analysisRunRef.current !== runId) return;
        const response = await apiClient.analyzePage(page);
        if (analysisRunRef.current !== runId) return;
        const analysis = validateSemanticAnalysisForPage(response, page);
        setSemanticAnalysis(analysis);
        const simplifications: Record<string, SimplifyTextResponse> = {};
        if (resolution.preferences.simplifyLanguage) {
          await Promise.all(
            analysis.complexTextBlocks.slice(0, 3).map(async ({ id }) => {
              const element = page.elements.find((candidate) => candidate.id === id);
              if (!element?.text || element.critical) return;
              try {
                simplifications[id] = await apiClient.simplifyText({
                  text: element.text,
                  ...(page.language ? { language: page.language } : {}),
                  desiredLevel: 'simple',
                });
              } catch {
                // The original text remains untouched when optional simplification fails.
              }
            }),
          );
        }
        if (analysisRunRef.current !== runId) return;
        const semanticPlan = createSemanticPolicy(resolution, analysis, simplifications);
        const semanticStatus = await sendPageMessage(
          {
            type: 'PAGE_SEMANTIC_APPLY',
            plan: semanticPlan,
          },
          false,
        );
        if (analysisRunRef.current !== runId) return;
        setPageStatus(semanticStatus);
        setStatus(
          semanticStatus.errors.length > 0
            ? 'The page adapted with some non-blocking limitations.'
            : semanticPlan.instructions.length > 0
              ? 'Local and semantic adaptations are active. Every change can be undone.'
              : 'Local adaptations are active. No optional semantic changes were needed.',
        );
      } catch {
        if (analysisRunRef.current !== runId) return;
        setSemanticAnalysis(undefined);
        setStatus(
          next.errors.length > 0
            ? 'The page adapted locally with some non-blocking limitations.'
            : 'Local adaptations are active. Optional semantic analysis was unavailable.',
        );
      } finally {
        if (analysisRunRef.current === runId) setIsAnalyzing(false);
      }
    } catch {
      setStatus(
        'AURA cannot adapt this browser page. Try a normal website tab and try again.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function undoPage() {
    analysisRunRef.current += 1;
    setIsAnalyzing(false);
    setSemanticAnalysis(undefined);
    setIsBusy(true);
    try {
      const next = await sendPageMessage({ type: 'PAGE_REVERT' });
      setPageStatus(next);
      setStatus('All AURA page adaptations were undone.');
    } catch {
      setStatus('AURA could not reach this page to undo adaptations.');
    } finally {
      setIsBusy(false);
    }
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

  const preferenceMeta = (key: keyof AdaptationPreferences) => {
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
  };

  return (
    <main className="shell">
      <header className="masthead">
        <p className="eyebrow">Adaptive User-Responsive Accessibility</p>
        <h1>AURA</h1>
        <p className="lede">
          Shape the web around your capabilities and explicit preferences.
        </p>
      </header>

      <p className="notice" role="status" aria-live="polite">
        {status}
      </p>

      {showOnboarding ? (
        <Onboarding
          onCancel={() => setShowOnboarding(false)}
          onComplete={completeOnboarding}
        />
      ) : profileState && draft && resolution ? (
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <section className="card" aria-labelledby="profile-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Local profile</p>
                <h2 id="profile-heading">Your adaptation setup</h2>
              </div>
              <span className="local-badge">Stored locally</span>
            </div>

            <label htmlFor="active-profile">Active profile</label>
            <select
              id="active-profile"
              value={profileState.activeProfileId}
              disabled={isBusy}
              onChange={(event) => void selectProfile(event.currentTarget.value)}
            >
              {profileState.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>

            <label htmlFor="profile-name">Profile name</label>
            <input
              id="profile-name"
              value={draft.name}
              maxLength={80}
              required
              onChange={(event) =>
                setDraft({ ...draft, name: event.currentTarget.value })
              }
            />
            <button
              className="secondary"
              type="button"
              onClick={() => setShowOnboarding(true)}
            >
              Start new accessible setup
            </button>
          </section>

          <section className="card" aria-labelledby="presentation-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Presentation</p>
                <h2 id="presentation-heading">Reading preferences</h2>
              </div>
            </div>

            <label htmlFor="text-scale">
              Text size <output>{Math.round(draft.preferences.textScale * 100)}%</output>
            </label>
            <input
              id="text-scale"
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={draft.preferences.textScale}
              onChange={(event) =>
                updatePreference('textScale', event.currentTarget.valueAsNumber)
              }
            />
            {preferenceMeta('textScale')}

            <label htmlFor="line-spacing">
              Line spacing <output>{draft.preferences.lineSpacing.toFixed(1)}×</output>
            </label>
            <input
              id="line-spacing"
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={draft.preferences.lineSpacing}
              onChange={(event) =>
                updatePreference('lineSpacing', event.currentTarget.valueAsNumber)
              }
            />
            {preferenceMeta('lineSpacing')}

            <label htmlFor="reading-width">Reading width</label>
            <select
              id="reading-width"
              value={draft.preferences.readingWidth}
              onChange={(event) =>
                updatePreference(
                  'readingWidth',
                  event.currentTarget.value as AdaptationPreferences['readingWidth'],
                )
              }
            >
              <option value="normal">Normal</option>
              <option value="narrow">Narrow</option>
              <option value="very_narrow">Very narrow</option>
            </select>
            {preferenceMeta('readingWidth')}

            <label htmlFor="contrast">Contrast</label>
            <select
              id="contrast"
              value={draft.preferences.contrast}
              onChange={(event) =>
                updatePreference(
                  'contrast',
                  event.currentTarget.value as AdaptationPreferences['contrast'],
                )
              }
            >
              <option value="default">Keep site colors</option>
              <option value="enhanced">Enhanced contrast</option>
            </select>
            {preferenceMeta('contrast')}
          </section>

          <fieldset className="card choice-list">
            <legend>Adaptation preferences</legend>
            {BOOLEAN_PREFERENCES.map(([key, label]) => (
              <div key={key}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.preferences[key])}
                    onChange={(event) => updatePreference(key, event.currentTarget.checked)}
                  />
                  <span>{label}</span>
                </label>
                {preferenceMeta(key)}
              </div>
            ))}

            <label htmlFor="target-size">
              Minimum control size <output>{draft.preferences.targetSizePx}px</output>
            </label>
            <input
              id="target-size"
              type="range"
              min="32"
              max="72"
              step="4"
              disabled={!draft.preferences.enlargeTargets}
              value={draft.preferences.targetSizePx}
              onChange={(event) =>
                updatePreference('targetSizePx', event.currentTarget.valueAsNumber)
              }
            />
            {preferenceMeta('targetSizePx')}
          </fieldset>

          <details className="card capability-details">
            <summary>Capability signals</summary>
            <p className="help-text">
              These answers guide recommendations. They are not medical measurements or a
              diagnosis. Confidence is considered before a capability changes the interface.
            </p>
            {CAPABILITY_DIMENSION_NAMES.map((name) => (
              <div className="dimension" key={name}>
                <label htmlFor={`dimension-${name}`}>
                  Comfort relying on {DIMENSION_LABELS[name].toLowerCase()}{' '}
                  <output>{Math.round(draft.dimensions[name].capacity * 100)}%</output>
                </label>
                <input
                  id={`dimension-${name}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draft.dimensions[name].capacity}
                  onChange={(event) =>
                    updateDimension(name, event.currentTarget.valueAsNumber)
                  }
                />
              </div>
            ))}
          </details>

          <details className="card capability-details">
            <summary>Why AURA recommends these settings</summary>
            <p className="help-text">
              Capability recommendations are the lowest-priority suggestions. Onboarding,
              calibration, and your manual choices override them.
            </p>
            <ul className="summary-list">
              {explainedPreferences.map((key) => (
                <li key={key}>
                  <strong>{PREFERENCE_LABELS[key]}:</strong>{' '}
                  {preferenceSourceLabel(resolution.sources[key])}.{' '}
                  {resolution.reasons[key] ?? 'Resolved from your accessibility profile.'}
                </li>
              ))}
            </ul>
            {hasExplicitChoices ? (
              <button
                className="secondary"
                type="button"
                onClick={resetAllExplicitPreferences}
              >
                Use AURA recommendations for all manual choices
              </button>
            ) : null}
          </details>

          <section className="card" aria-labelledby="page-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Current tab</p>
                <h2 id="page-heading">Adapt this page</h2>
              </div>
              <span className="local-badge">Works offline</span>
            </div>
            <p className="help-text">
              AURA first applies reversible local rules. If the optional analyzer is
              available, it receives only a bounded semantic outline with form values,
              passwords, URLs, scripts, and storage data omitted.
            </p>
            {pageStatus?.adapted ? (
              <div>
                <p>{pageStatus.appliedKinds.length} adaptations active:</p>
                <ul className="adaptation-status-list">
                  {pageStatus.appliedKinds.map((kind) => (
                    <li key={kind}>
                      <span>{adaptationLabel(kind)}</span>
                      <span className="adaptation-kind-badge">
                        {SEMANTIC_KINDS.has(kind) ? 'Semantic' : 'Local'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {semanticAnalysis ? (
              <p className="help-text">
                Optional analysis found {semanticAnalysis.mainContent.length} main region(s)
                and {semanticAnalysis.primaryActions.length} likely primary action(s).
              </p>
            ) : null}
            <div className="actions compact-actions">
              <button
                className="primary"
                type="button"
                disabled={isBusy || isAnalyzing}
                onClick={() => void adaptPage()}
              >
                Adapt this page
              </button>
              <button
                className="secondary"
                type="button"
                disabled={isBusy || !pageStatus?.adapted}
                onClick={() => void undoPage()}
              >
                Undo all
              </button>
            </div>
          </section>

          <div className="actions">
            <button className="primary" type="submit" disabled={isBusy}>
              Save profile
            </button>
            <button
              className="secondary"
              type="button"
              disabled={isBusy}
              onClick={() => void resetProfiles()}
            >
              Reset demo profiles
            </button>
          </div>
        </form>
      ) : (
        <section className="card" aria-busy={isBusy}>
          <h2>Preparing your profiles</h2>
          <p className="help-text">AURA stores this setup only in your browser.</p>
        </section>
      )}
    </main>
  );
}
