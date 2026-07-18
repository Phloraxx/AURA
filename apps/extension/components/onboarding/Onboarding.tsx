import type { CapabilityProfile } from '@aura/shared';
import { useEffect, useRef, useState } from 'react';

import {
  CALIBRATION_TASKS,
  ONBOARDING_QUESTIONS,
  answerCurrentQuestion,
  applyCalibrationChoice,
  profileSummary,
  startOnboarding,
  type OnboardingMode,
  type OnboardingState,
} from '../../lib/onboarding/onboarding-engine';

interface OnboardingProps {
  onCancel: () => void;
  onComplete: (profile: CapabilityProfile) => Promise<void>;
}

const CALIBRATION_OPTIONS = {
  text_presentation: [
    ['comfortable', 'Standard', 'Original size and width'],
    ['spacious', 'Spacious', 'Larger text with more line spacing'],
    ['largest', 'Largest', 'Largest text in a focused reading column'],
  ],
  control_size: [
    ['standard', 'Standard controls', '44 pixel minimum target'],
    ['large', 'Large controls', '52 pixel minimum target'],
    ['largest', 'Largest controls', '60 pixel minimum target'],
  ],
  clutter_focus: [
    ['dense', 'Keep everything visible', 'Main and secondary content together'],
    ['focused', 'Focused layout', 'Primary content first; secondary content collapsed'],
  ],
} as const;

const CALIBRATION_TITLES = {
  text_presentation: 'Which text presentation feels easiest to read?',
  control_size: 'Which set of controls feels easiest to select comfortably?',
  clutter_focus: 'Which layout feels easier to follow?',
} as const;

export function Onboarding({ onCancel, onComplete }: OnboardingProps) {
  const [state, setState] = useState<OnboardingState>();
  const [textAnswer, setTextAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state) headingRef.current?.focus();
  }, [state?.phase, state?.questionIndex, state?.calibrationIndex]);

  function chooseMode(mode: OnboardingMode) {
    setState(startOnboarding(mode));
  }

  function answer(answer: string) {
    if (!state) return;
    setState(answerCurrentQuestion(state, answer));
    setTextAnswer('');
  }

  function calibrate(choice: string) {
    if (!state) return;
    setState(applyCalibrationChoice(state, choice));
  }

  if (!state) {
    return (
      <section className="onboarding card" aria-labelledby="setup-title">
        <p className="section-kicker">Accessible setup</p>
        <h2 id="setup-title">How would you like to set up AURA?</h2>
        <p className="help-text">
          Every route creates the same editable capability profile. You can change input
          style during setup and skip any question.
        </p>
        <div className="setup-routes">
          <button
            className="route-button"
            type="button"
            disabled
            aria-describedby="voice-phase-note"
          >
            <strong>Talk with me</strong>
            <span>Answer by voice</span>
          </button>
          <p id="voice-phase-note" className="route-note">
            Voice recording is being added in the voice phase. All current setup steps
            work without voice.
          </p>
          <button className="route-button" type="button" onClick={() => chooseMode('text')}>
            <strong>Chat with me</strong>
            <span>Type answers in your own words</span>
          </button>
          <button
            className="route-button"
            type="button"
            onClick={() => chooseMode('choices')}
          >
            <strong>Choose simple answers</strong>
            <span>Use large Yes, No, or Skip controls</span>
          </button>
          <button className="route-button" type="button" onClick={() => chooseMode('quick')}>
            <strong>Quick setup</strong>
            <span>Go directly to three preference activities</span>
          </button>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>
          Return to profiles
        </button>
      </section>
    );
  }

  if (state.phase === 'questions') {
    const question = ONBOARDING_QUESTIONS[state.questionIndex];
    if (!question) return null;
    return (
      <section className="onboarding card" aria-labelledby="question-title">
        <p className="progress-text">
          Question {state.questionIndex + 1} of {ONBOARDING_QUESTIONS.length}
        </p>
        <h2 id="question-title" ref={headingRef} tabIndex={-1}>
          {question.prompt}
        </h2>
        <p className="help-text">{question.help}</p>

        {state.mode === 'text' ? (
          <form
            className="answer-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (textAnswer.trim()) answer(textAnswer);
            }}
          >
            <label htmlFor="onboarding-answer">Your answer</label>
            <textarea
              id="onboarding-answer"
              rows={4}
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.currentTarget.value)}
            />
            <button className="primary" type="submit" disabled={!textAnswer.trim()}>
              Continue
            </button>
          </form>
        ) : (
          <div className="large-answers" aria-label="Answer choices">
            <button className="choice-button" type="button" onClick={() => answer('yes')}>
              Yes
            </button>
            <button className="choice-button" type="button" onClick={() => answer('no')}>
              No
            </button>
            <button className="choice-button" type="button" onClick={() => answer('unsure')}>
              Not sure
            </button>
          </div>
        )}

        <div className="inline-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => setState({ ...state, mode: state.mode === 'text' ? 'choices' : 'text' })}
          >
            {state.mode === 'text' ? 'Use simple answers' : 'Type my answer'}
          </button>
          <button className="text-button" type="button" onClick={() => answer('skip')}>
            Skip this question
          </button>
          <button className="text-button" type="button" onClick={onCancel}>
            Exit setup
          </button>
        </div>
      </section>
    );
  }

  if (state.phase === 'calibration') {
    const task = CALIBRATION_TASKS[state.calibrationIndex];
    if (!task) return null;
    return (
      <section className="onboarding card" aria-labelledby="calibration-title">
        <p className="progress-text">
          Optional activity {state.calibrationIndex + 1} of {CALIBRATION_TASKS.length}
        </p>
        <h2 id="calibration-title" ref={headingRef} tabIndex={-1}>
          {CALIBRATION_TITLES[task]}
        </h2>
        <p className="help-text">
          Choose what feels comfortable. This records a preference, not a test result.
        </p>
        <div className={`calibration-options calibration-${task}`}>
          {CALIBRATION_OPTIONS[task].map(([value, title, description]) => (
            <button
              className="calibration-card"
              key={value}
              type="button"
              onClick={() => calibrate(value)}
            >
              <strong>{title}</strong>
              <span>{description}</span>
              {task === 'text_presentation' ? (
                <span className={`text-sample sample-${value}`}>
                  Clear text should feel comfortable to read.
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="inline-actions">
          <button className="text-button" type="button" onClick={() => calibrate('skip')}>
            Skip this activity
          </button>
          <button className="text-button" type="button" onClick={onCancel}>
            Exit setup
          </button>
        </div>
      </section>
    );
  }

  const summary = profileSummary(state.profile);
  return (
    <section className="onboarding card" aria-labelledby="review-title">
      <p className="section-kicker">Review</p>
      <h2 id="review-title" ref={headingRef} tabIndex={-1}>
        Your AURA setup
      </h2>
      <p className="help-text">AURA will currently:</p>
      <ul className="summary-list">
        {summary.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <label htmlFor="onboarding-profile-name">Profile name</label>
      <input
        id="onboarding-profile-name"
        value={state.profile.name}
        maxLength={80}
        onChange={(event) =>
          setState({
            ...state,
            profile: { ...state.profile, name: event.currentTarget.value },
          })
        }
      />
      <p className="help-text">
        Nothing here is a diagnosis. You can edit every preference after saving.
      </p>
      {error ? <p className="error-message">{error}</p> : null}
      <div className="actions compact-actions">
        <button
          className="primary"
          type="button"
          disabled={isSaving || !state.profile.name.trim()}
          onClick={() => {
            setIsSaving(true);
            setError('');
            void onComplete(state.profile)
              .catch(() => setError('AURA could not save this profile. Please try again.'))
              .finally(() => setIsSaving(false));
          }}
        >
          Save and review profile
        </button>
        <button className="secondary" type="button" disabled={isSaving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
