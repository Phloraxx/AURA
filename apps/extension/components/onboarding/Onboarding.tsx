import type { CapabilityProfile } from '@aura/shared';
import { useEffect, useRef, useState } from 'react';

import { createAuraApiClient } from '../../lib/api/client';
import {
  CALIBRATION_TASKS,
  ONBOARDING_QUESTIONS,
  answerCurrentQuestion,
  applyCalibrationChoice,
  applyProviderResponse,
  profileSummary,
  startOnboarding,
  type OnboardingMode,
  type OnboardingState,
} from '../../lib/onboarding/onboarding-engine';
import { createBrowserSpeechOutput } from '../../lib/voice/speech-output';
import { VoiceAnswer } from './VoiceAnswer';

const apiClient = createAuraApiClient();

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
  const [isAnswering, setIsAnswering] = useState(false);
  const [remotePrompt, setRemotePrompt] = useState<string>();
  const [transcript, setTranscript] = useState<
    Array<{ role: 'assistant' | 'user'; content: string }>
  >([]);
  const [adaptiveStatus, setAdaptiveStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const speechOutputRef = useRef(createBrowserSpeechOutput());

  useEffect(() => {
    speechOutputRef.current.stop();
    if (state) headingRef.current?.focus();
  }, [state?.phase, state?.questionIndex, state?.calibrationIndex]);

  useEffect(() => () => speechOutputRef.current.stop(), []);

  function chooseMode(mode: OnboardingMode) {
    setState(startOnboarding(mode));
  }

  async function answer(answer: string) {
    if (!state) return;
    const question = ONBOARDING_QUESTIONS[state.questionIndex];
    if (!question) return;
    const prompt = remotePrompt ?? question.prompt;
    const nextTranscript = [
      ...transcript,
      { role: 'assistant' as const, content: prompt },
      { role: 'user' as const, content: answer },
    ].slice(-16);
    setIsAnswering(true);
    try {
      const response = await apiClient.respondToOnboarding({
        profile: state.profile,
        transcript: nextTranscript,
        userResponse: answer,
        askedAreas: ONBOARDING_QUESTIONS.slice(0, state.questionIndex + 1).map(
          ({ area }) => area,
        ),
      });
      setState(applyProviderResponse(state, response, answer));
      setRemotePrompt(response.assistantMessage);
      setTranscript(nextTranscript);
      setAdaptiveStatus('Adaptive follow-up loaded.');
    } catch {
      setState(answerCurrentQuestion(state, answer));
      setRemotePrompt(undefined);
      setTranscript(nextTranscript);
      setAdaptiveStatus('Adaptive follow-up is unavailable; local setup continues.');
    } finally {
      setTextAnswer('');
      setIsAnswering(false);
    }
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
            onClick={() => chooseMode('voice')}
          >
            <strong>Talk with me</strong>
            <span>Answer by voice</span>
          </button>
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
          {remotePrompt ?? question.prompt}
        </h2>
        <p className="help-text">{question.help}</p>

        <div className="inline-actions speech-actions">
          <button
            className="text-button"
            type="button"
            disabled={!speechOutputRef.current.supported}
            onClick={() => speechOutputRef.current.speak(remotePrompt ?? question.prompt)}
          >
            Read question aloud
          </button>
          <button
            className="text-button"
            type="button"
            disabled={!speechOutputRef.current.supported}
            onClick={() => speechOutputRef.current.stop()}
          >
            Stop reading
          </button>
        </div>

        {state.mode === 'voice' ? (
          <VoiceAnswer
            onTranscript={(text) => {
              setTextAnswer(text);
              setState({ ...state, mode: 'text' });
              setAdaptiveStatus('Transcript ready. Review it, then continue.');
            }}
          />
        ) : state.mode === 'text' ? (
          <form
            className="answer-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (textAnswer.trim()) void answer(textAnswer);
            }}
          >
            <label htmlFor="onboarding-answer">Your answer</label>
            <textarea
              id="onboarding-answer"
              rows={4}
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.currentTarget.value)}
            />
            <button
              className="primary"
              type="submit"
              disabled={isAnswering || !textAnswer.trim()}
            >
              Continue
            </button>
          </form>
        ) : (
          <div className="large-answers" aria-label="Answer choices">
            <button
              className="choice-button"
              type="button"
              disabled={isAnswering}
              onClick={() => void answer('yes')}
            >
              Yes
            </button>
            <button
              className="choice-button"
              type="button"
              disabled={isAnswering}
              onClick={() => void answer('no')}
            >
              No
            </button>
            <button
              className="choice-button"
              type="button"
              disabled={isAnswering}
              onClick={() => void answer('unsure')}
            >
              Not sure
            </button>
          </div>
        )}

        <div className="inline-actions">
          {state.mode !== 'text' ? (
            <button
              className="text-button"
              type="button"
              onClick={() => setState({ ...state, mode: 'text' })}
            >
              Type my answer
            </button>
          ) : null}
          {state.mode !== 'choices' ? (
            <button
              className="text-button"
              type="button"
              onClick={() => setState({ ...state, mode: 'choices' })}
            >
              Use simple answers
            </button>
          ) : null}
          {state.mode !== 'voice' ? (
            <button
              className="text-button"
              type="button"
              onClick={() => setState({ ...state, mode: 'voice' })}
            >
              Answer by voice
            </button>
          ) : null}
          <button
            className="text-button"
            type="button"
            disabled={isAnswering}
            onClick={() => void answer('skip')}
          >
            Skip this question
          </button>
          <button className="text-button" type="button" onClick={onCancel}>
            Exit setup
          </button>
        </div>
        {adaptiveStatus ? (
          <p className="route-note" role="status" aria-live="polite">
            {adaptiveStatus}
          </p>
        ) : null}
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
