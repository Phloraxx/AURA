import {
  CAPABILITY_DIMENSION_NAMES,
  type AdaptationPreferences,
  type CapabilityDimensions,
  type CapabilityProfile,
} from '@aura/shared';
import { useEffect, useState } from 'react';

import {
  createProfileStore,
  type ProfileState,
} from '../../lib/profile/profile-store';

const store = createProfileStore();

const BOOLEAN_PREFERENCES = [
  ['reduceMotion', 'Reduce animation and motion'],
  ['focusMode', 'Focus on primary content'],
  ['simplifyLanguage', 'Offer simpler wording'],
  ['enlargeTargets', 'Make controls easier to select'],
  ['stepByStepForms', 'Prefer forms in smaller steps'],
  ['hideDistractions', 'Collapse distracting secondary content'],
  ['clarifyControls', 'Clarify ambiguous controls'],
] as const satisfies readonly [keyof AdaptationPreferences, string][];

const DIMENSION_LABELS: Record<keyof CapabilityDimensions, string> = {
  visual: 'Visual information',
  auditory: 'Audio information',
  motor: 'Pointer and keyboard control',
  cognitive: 'Complex instructions and workflows',
  attention: 'Focus amid competing content',
  language: 'Complex language and terminology',
};

function activeProfile(state: ProfileState): CapabilityProfile | undefined {
  return state.profiles.find(({ id }) => id === state.activeProfileId);
}

export function App() {
  const [profileState, setProfileState] = useState<ProfileState>();
  const [draft, setDraft] = useState<CapabilityProfile>();
  const [status, setStatus] = useState('Loading local profiles…');
  const [isBusy, setIsBusy] = useState(true);

  function adoptState(nextState: ProfileState, message: string) {
    setProfileState(nextState);
    setDraft(activeProfile(nextState));
    setStatus(message);
  }

  useEffect(() => {
    let active = true;

    void store
      .getState()
      .then((state) => {
        if (active) adoptState(state, 'Profile loaded from this browser.');
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
    setDraft((current) =>
      current
        ? {
            ...current,
            preferences: { ...current.preferences, [key]: value },
          }
        : current,
    );
  }

  function updateDimension(
    name: keyof CapabilityDimensions,
    capacity: number,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            dimensions: {
              ...current.dimensions,
              [name]: {
                capacity,
                confidence: 1,
                sources: ['self_report'],
              },
            },
          }
        : current,
    );
  }

  async function selectProfile(profileId: string) {
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
        ...draft,
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

      {profileState && draft ? (
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
          </section>

          <fieldset className="card choice-list">
            <legend>Adaptation preferences</legend>
            {BOOLEAN_PREFERENCES.map(([key, label]) => (
              <label className="check-row" key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(draft.preferences[key])}
                  onChange={(event) => updatePreference(key, event.currentTarget.checked)}
                />
                <span>{label}</span>
              </label>
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
          </fieldset>

          <details className="card capability-details">
            <summary>Capability signals</summary>
            <p className="help-text">
              These answers guide recommendations. They are not medical measurements or a
              diagnosis.
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
