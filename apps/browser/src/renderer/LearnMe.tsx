import { useMemo, useState } from 'react';

import {
  applyCalibrationChoices,
  completeBrowserProfile,
  createDefaultBrowserProfile,
  summarizeBrowserProfile,
  type BrowserProfile,
  type CalibrationChoice,
} from '../shared/profile';
import { AuraBrand } from './Brand';

interface LearnMeProps {
  initialProfile: BrowserProfile | undefined;
  onComplete: (profile: BrowserProfile) => Promise<void>;
}

const INITIAL_CHOICES: CalibrationChoice[] = [
  { area: 'reading', choice: 'comfortable' },
  { area: 'interaction', choice: 'comfortable' },
  { area: 'attention', choice: 'calm' },
  {
    area: 'understanding',
    choice: 'balanced',
    preserveTechnicalTerms: true,
  },
];

const STEP_LABELS = ['Welcome', 'Reading', 'Interaction', 'Focus', 'Language', 'Review'];

function replaceChoice(
  choices: CalibrationChoice[],
  nextChoice: CalibrationChoice,
): CalibrationChoice[] {
  return [
    ...choices.filter((choice) => choice.area !== nextChoice.area),
    nextChoice,
  ];
}

function ChoiceButton({
  checked,
  children,
  description,
  onClick,
}: {
  checked: boolean;
  children: React.ReactNode;
  description: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      aria-pressed={checked}
      className={checked ? 'comfort-choice selected' : 'comfort-choice'}
      onClick={onClick}
      type="button"
    >
      <span>{children}</span>
      <small>{description}</small>
    </button>
  );
}

export function LearnMe({
  initialProfile,
  onComplete,
}: LearnMeProps): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [choices, setChoices] =
    useState<CalibrationChoice[]>(INITIAL_CHOICES);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseProfile = useMemo(
    () => initialProfile ?? createDefaultBrowserProfile(),
    [initialProfile],
  );
  const previewProfile = useMemo(
    () => applyCalibrationChoices(baseProfile, choices),
    [baseProfile, choices],
  );

  const reading = choices.find((choice) => choice.area === 'reading');
  const interaction = choices.find((choice) => choice.area === 'interaction');
  const attention = choices.find((choice) => choice.area === 'attention');
  const understanding = choices.find(
    (choice) => choice.area === 'understanding',
  );

  function choose(choice: CalibrationChoice): void {
    setChoices((current) => replaceChoice(current, choice));
  }

  async function finish(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      let learnedPreference: string | null = null;
      if (note.trim()) {
        const response = await window.aura.onboardingTurn({
          choices,
          userResponse: note,
        });
        learnedPreference = response.learnedPreference;
      }

      const withMemory: BrowserProfile = {
        ...previewProfile,
        learnedPreferences: learnedPreference ? [learnedPreference] : [],
      };
      const completed = completeBrowserProfile(
        withMemory,
        summarizeBrowserProfile(withMemory),
      );
      await onComplete(completed);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not save this profile.',
      );
      setSaving(false);
    }
  }

  async function skip(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const profile = applyCalibrationChoices(
        createDefaultBrowserProfile(),
        INITIAL_CHOICES,
      );
      await onComplete(
        completeBrowserProfile(profile, summarizeBrowserProfile(profile)),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not save this profile.',
      );
      setSaving(false);
    }
  }

  return (
    <main
      className={`learn-me density-${previewProfile.preferences.informationDensity}`}
      style={{
        '--preview-line-height': previewProfile.preferences.lineSpacing,
        '--preview-scale': previewProfile.preferences.textScale,
        '--target-size': `${previewProfile.preferences.targetSizePx}px`,
      } as React.CSSProperties}
    >
      <header className="learn-me-header">
        <AuraBrand />
        <button className="text-button" disabled={saving} onClick={() => void skip()} type="button">
          Use comfortable defaults
        </button>
      </header>

      <section className="learn-me-card" aria-labelledby="learn-me-title">
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${STEP_LABELS.length}`}>
          {STEP_LABELS.map((label, index) => (
            <span className={index <= step ? 'active' : ''} key={label}>
              <i aria-hidden="true" />
              <b>{label}</b>
            </span>
          ))}
        </div>

        {step === 0 ? (
          <div className="learn-me-copy intro-step">
            <p className="eyebrow">Learn Me</p>
            <h1 id="learn-me-title">Let’s find your comfortable web.</h1>
            <p>
              AURA adapts around how you prefer to read, focus, understand, and
              interact. This is not a diagnosis—just four quick comfort choices
              you can change later.
            </p>
            <div className="intro-principles">
              <span>About one minute</span>
              <span>Stored on this Mac</span>
              <span>Always editable</span>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="learn-me-copy">
            <p className="eyebrow">Reading comfort</p>
            <h1 id="learn-me-title">Which text feels easiest?</h1>
            <p>The preview changes immediately. Choose comfort, not a test result.</p>
            <div className="comfort-grid" role="group" aria-label="Reading presentation">
              <ChoiceButton checked={reading?.area === 'reading' && reading.choice === 'standard'} description="Original size and a familiar page width" onClick={() => choose({ area: 'reading', choice: 'standard' })}>
                Standard
              </ChoiceButton>
              <ChoiceButton checked={reading?.area === 'reading' && reading.choice === 'comfortable'} description="A little larger, with more space" onClick={() => choose({ area: 'reading', choice: 'comfortable' })}>
                Comfortable
              </ChoiceButton>
              <ChoiceButton checked={reading?.area === 'reading' && reading.choice === 'largest'} description="Largest text and a focused reading width" onClick={() => choose({ area: 'reading', choice: 'largest' })}>
                Largest
              </ChoiceButton>
            </div>
            <div className="live-preview" aria-live="polite">
              <strong>A calmer page can make the next step easier to find.</strong>
              <span>This preview uses your current text size and spacing.</span>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="learn-me-copy">
            <p className="eyebrow">Interaction comfort</p>
            <h1 id="learn-me-title">How large should controls feel?</h1>
            <p>Pick the size that feels easy to select without needing precision.</p>
            <div className="comfort-grid" role="group" aria-label="Control size">
              <ChoiceButton checked={interaction?.area === 'interaction' && interaction.choice === 'standard'} description="44-pixel minimum targets" onClick={() => choose({ area: 'interaction', choice: 'standard' })}>Standard</ChoiceButton>
              <ChoiceButton checked={interaction?.area === 'interaction' && interaction.choice === 'comfortable'} description="52-pixel minimum targets" onClick={() => choose({ area: 'interaction', choice: 'comfortable' })}>Comfortable</ChoiceButton>
              <ChoiceButton checked={interaction?.area === 'interaction' && interaction.choice === 'largest'} description="60-pixel minimum targets" onClick={() => choose({ area: 'interaction', choice: 'largest' })}>Largest</ChoiceButton>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="learn-me-copy">
            <p className="eyebrow">Focus and motion</p>
            <h1 id="learn-me-title">How much should AURA show at once?</h1>
            <p>Everything remains available. This controls emphasis and pacing.</p>
            <div className="comfort-grid" role="group" aria-label="Information density">
              <ChoiceButton checked={attention?.area === 'attention' && attention.choice === 'standard'} description="Keep the page’s normal density and motion" onClick={() => choose({ area: 'attention', choice: 'standard' })}>Full page</ChoiceButton>
              <ChoiceButton checked={attention?.area === 'attention' && attention.choice === 'calm'} description="Reduce motion and soften secondary content" onClick={() => choose({ area: 'attention', choice: 'calm' })}>Calmer</ChoiceButton>
              <ChoiceButton checked={attention?.area === 'attention' && attention.choice === 'step_by_step'} description="Prefer one clear action or section at a time" onClick={() => choose({ area: 'attention', choice: 'step_by_step' })}>Step by step</ChoiceButton>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="learn-me-copy">
            <p className="eyebrow">Explanation style</p>
            <h1 id="learn-me-title">How should AURA explain things?</h1>
            <div className="comfort-grid" role="group" aria-label="Explanation detail">
              {(['concise', 'balanced', 'detailed'] as const).map((choice) => (
                <ChoiceButton
                  checked={understanding?.area === 'understanding' && understanding.choice === choice}
                  description={{
                    concise: 'Short, direct explanations',
                    balanced: 'Enough context without overload',
                    detailed: 'More context and supporting detail',
                  }[choice]}
                  key={choice}
                  onClick={() => choose({
                    area: 'understanding',
                    choice,
                    preserveTechnicalTerms:
                      understanding?.area === 'understanding'
                        ? understanding.preserveTechnicalTerms
                        : true,
                  })}
                >
                  {choice.charAt(0).toUpperCase() + choice.slice(1)}
                </ChoiceButton>
              ))}
            </div>
            <label className="check-choice">
              <input
                checked={understanding?.area === 'understanding' ? understanding.preserveTechnicalTerms : true}
                onChange={(event) => choose({
                  area: 'understanding',
                  choice: understanding?.area === 'understanding' ? understanding.choice : 'balanced',
                  preserveTechnicalTerms: event.currentTarget.checked,
                })}
                type="checkbox"
              />
              Keep technical terms, and explain them when needed
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="learn-me-copy">
            <p className="eyebrow">Your AURA</p>
            <h1 id="learn-me-title">One last thing—only if useful.</h1>
            <p>
              Tell AURA one preference we did not ask about. AURA can turn your
              own words into one editable memory. You can leave this blank.
            </p>
            <label className="note-field">
              <span>Anything else that makes websites easier for you?</span>
              <textarea
                maxLength={1_000}
                onChange={(event) => setNote(event.currentTarget.value)}
                placeholder="For example: Keep technical words, but explain them briefly."
                rows={4}
                value={note}
              />
            </label>
            <div className="profile-summary">
              <strong>Your current profile</strong>
              <p>{summarizeBrowserProfile(previewProfile)}</p>
            </div>
          </div>
        ) : null}

        {error ? <p className="onboarding-error" role="alert">{error}</p> : null}

        <footer className="onboarding-actions">
          <button
            className="secondary-action"
            disabled={step === 0 || saving}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          {step < STEP_LABELS.length - 1 ? (
            <button className="primary-action" onClick={() => setStep((current) => current + 1)} type="button">
              {step === 0 ? 'Find my comfort' : 'Continue'}
            </button>
          ) : (
            <button className="primary-action" disabled={saving} onClick={() => void finish()} type="button">
              {saving ? 'Creating your AURA…' : 'Start browsing'}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
