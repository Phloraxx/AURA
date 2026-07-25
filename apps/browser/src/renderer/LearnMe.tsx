import { useMemo, useState } from 'react';

import {
  applyFunctionalAnswers,
  completeBrowserProfile,
  createDefaultBrowserProfile,
  summarizeBrowserProfile,
  type BrowserProfile,
  type FunctionalAnswer,
  type FunctionalDifficulty,
  type OnboardingTurnResponse,
} from '../shared/profile';
import { AuraBrand, AuraGuide, type AuraGuideMood } from './Brand';

interface LearnMeProps {
  initialProfile: BrowserProfile | undefined;
  onComplete: (profile: BrowserProfile) => Promise<void>;
}

const ANSWERS: Array<{
  description: string;
  label: string;
  value: FunctionalDifficulty;
}> = [
  { value: 'no_difficulty', label: 'No difficulty', description: 'This usually works comfortably' },
  { value: 'some_difficulty', label: 'Some difficulty', description: 'A little support would help' },
  { value: 'a_lot_of_difficulty', label: 'A lot of difficulty', description: 'This often gets in the way' },
  { value: 'cannot_reliably', label: 'Cannot reliably', description: 'I need another way to do this' },
  { value: 'not_sure', label: 'Not sure', description: 'AURA can start neutral' },
];

export function LearnMe({
  initialProfile,
  onComplete,
}: LearnMeProps): React.JSX.Element {
  const [phase, setPhase] = useState<'intro' | 'interview' | 'review'>('intro');
  const [answers, setAnswers] = useState<FunctionalAnswer[]>([]);
  const [turn, setTurn] = useState<OnboardingTurnResponse | null>(null);
  const [selected, setSelected] = useState<FunctionalDifficulty | null>(null);
  const [detail, setDetail] = useState('');
  const [memories, setMemories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseProfile = useMemo(
    () => initialProfile ?? createDefaultBrowserProfile(),
    [initialProfile],
  );
  const previewProfile = useMemo(
    () => applyFunctionalAnswers(baseProfile, answers),
    [answers, baseProfile],
  );

  async function ask(nextAnswers: FunctionalAnswer[], words = ''): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await window.aura.onboardingTurn({
        answers: nextAnswers,
        choices: [],
        userResponse: words,
      });
      setTurn(response);
      if (
        response.learnedPreference !== null &&
        !memories.includes(response.learnedPreference)
      ) {
        setMemories((current) => [...current, response.learnedPreference!].slice(-6));
      }
      if (response.complete) setPhase('review');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'AURA could not continue.');
    } finally {
      setBusy(false);
    }
  }

  async function begin(): Promise<void> {
    setPhase('interview');
    await ask([]);
  }

  async function answerQuestion(): Promise<void> {
    if (turn?.nextQuestion === null || turn === null || selected === null) return;
    const nextAnswers = [
      ...answers.filter((answer) => answer.area !== turn.nextQuestion?.area),
      { area: turn.nextQuestion.area, difficulty: selected },
    ];
    setAnswers(nextAnswers);
    setSelected(null);
    const words = detail.trim();
    setDetail('');
    await ask(nextAnswers, words);
  }

  async function finish(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const withAnswers = applyFunctionalAnswers(baseProfile, answers);
      const withMemory = {
        ...withAnswers,
        learnedPreferences: memories,
      };
      await onComplete(
        completeBrowserProfile(withMemory, summarizeBrowserProfile(withMemory)),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'AURA could not save this profile.');
      setBusy(false);
    }
  }

  async function useDefaults(): Promise<void> {
    setBusy(true);
    try {
      const profile = createDefaultBrowserProfile();
      await onComplete(
        completeBrowserProfile(profile, summarizeBrowserProfile(profile)),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'AURA could not save this profile.');
      setBusy(false);
    }
  }

  const mood: AuraGuideMood = busy
    ? 'thinking'
    : phase === 'intro'
      ? 'welcoming'
      : phase === 'review'
        ? 'celebrating'
        : (turn?.mascotMood ?? 'asking');
  const answeredCount = answers.length;

  return (
    <main
      className="learn-me ai-oobe"
      data-reduce-motion={previewProfile.preferences.reduceMotion ? 'true' : 'false'}
      style={{
        '--preview-line-height': previewProfile.preferences.lineSpacing,
        '--preview-scale': previewProfile.preferences.textScale,
        '--target-size': `${previewProfile.preferences.targetSizePx}px`,
      } as React.CSSProperties}
    >
      <header className="learn-me-header">
        <AuraBrand />
        <button className="text-button" disabled={busy} onClick={() => void useDefaults()} type="button">
          Use comfortable defaults
        </button>
      </header>

      <section className="ai-oobe-layout">
        <aside className="guide-stage" aria-live="polite">
          <AuraGuide mood={mood} />
          <div className="guide-speech">
            <strong>{busy ? 'I’m listening…' : phase === 'review' ? 'Your AURA is ready.' : 'Hi, I’m the AURA Guide.'}</strong>
            <p>
              {busy
                ? 'I’m choosing the most useful next question.'
                : turn?.assistantMessage ??
                  'I’ll learn what makes websites comfortable for you—without asking for a diagnosis.'}
            </p>
          </div>
        </aside>

        <section className="learn-me-card" aria-labelledby="learn-me-title">
          <div className="functional-progress" aria-label={`${answeredCount} of 6 areas understood`}>
            <span><b>{answeredCount}</b> of 6 areas understood</span>
            <progress max={6} value={answeredCount} />
          </div>

          {phase === 'intro' ? (
            <div className="learn-me-copy intro-step">
              <p className="eyebrow">Learn Me</p>
              <h1 id="learn-me-title">Let’s shape the web around you.</h1>
              <p>
                I’ll ask six short questions about everyday web tasks. Your
                answers can overlap, change later, and never become a medical label.
              </p>
              <ul className="trust-list">
                <li>About two minutes</li>
                <li>Stored on this Mac</li>
                <li>AI-personalized, with a reliable offline path</li>
              </ul>
              <button className="primary-action" disabled={busy} onClick={() => void begin()} type="button">
                Start with AURA
              </button>
            </div>
          ) : null}

          {phase === 'interview' && turn?.nextQuestion ? (
            <div className="learn-me-copy question-step" key={turn.nextQuestion.area}>
              <p className="eyebrow">Your web experience</p>
              <h1 id="learn-me-title">{turn.nextQuestion.prompt}</h1>
              <p>{turn.nextQuestion.helpText}</p>
              <div className="answer-list" role="radiogroup" aria-label="Choose difficulty">
                {ANSWERS.map((answer) => (
                  <button
                    aria-checked={selected === answer.value}
                    className={selected === answer.value ? 'answer-choice selected' : 'answer-choice'}
                    key={answer.value}
                    onClick={() => setSelected(answer.value)}
                    role="radio"
                    type="button"
                  >
                    <span>{answer.label}</span>
                    <small>{answer.description}</small>
                  </button>
                ))}
              </div>
              <label className="oobe-detail">
                <span>Tell AURA more (optional)</span>
                <textarea
                  maxLength={1_000}
                  onChange={(event) => setDetail(event.currentTarget.value)}
                  placeholder="For example: Moving banners make it hard to keep my place."
                  rows={2}
                  value={detail}
                />
              </label>
              <button className="primary-action" disabled={busy || selected === null} onClick={() => void answerQuestion()} type="button">
                {busy ? 'Choosing what to ask next…' : 'Continue'}
              </button>
            </div>
          ) : null}

          {phase === 'review' ? (
            <div className="learn-me-copy review-step">
              <p className="eyebrow">Your first AURA</p>
              <h1 id="learn-me-title">Here’s how I’ll begin.</h1>
              <p>{summarizeBrowserProfile(previewProfile)}</p>
              <div className="profile-summary">
                <strong>Support combination</strong>
                <ul>
                  {Object.entries(previewProfile.capabilities)
                    .filter(([, level]) => level !== 'default')
                    .map(([area, level]) => (
                      <li key={area}><span>{area}</span><b>{level}</b></li>
                    ))}
                  {Object.values(previewProfile.capabilities).every((level) => level === 'default') ? (
                    <li><span>Comfort baseline</span><b>standard</b></li>
                  ) : null}
                </ul>
              </div>
              <p className="evidence-note">
                This is a functional comfort profile, not a diagnosis. You can
                re-run Learn Me whenever your needs change.
              </p>
              <button className="primary-action" disabled={busy} onClick={() => void finish()} type="button">
                {busy ? 'Creating your AURA…' : 'Start browsing'}
              </button>
            </div>
          ) : null}

          {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
        </section>
      </section>
    </main>
  );
}
