import { describe, expect, it } from 'vitest';

import {
  CALIBRATION_TASKS,
  ONBOARDING_QUESTIONS,
  answerCurrentQuestion,
  applyCalibrationChoice,
  profileSummary,
  startOnboarding,
} from './onboarding-engine';

describe('onboarding engine', () => {
  it('asks 5–8 functional questions without diagnosis language', () => {
    expect(ONBOARDING_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(ONBOARDING_QUESTIONS.length).toBeLessThanOrEqual(8);
    const copy = JSON.stringify(ONBOARDING_QUESTIONS).toLowerCase();
    expect(copy).not.toMatch(/diagnos|disability detection|medical condition/u);
  });

  it('uses one state machine for choice and text answers', () => {
    let choiceState = startOnboarding('choices');
    choiceState = answerCurrentQuestion(choiceState, 'yes');
    expect(choiceState.profile.preferences.textScale).toBe(1.3);
    expect(choiceState.profile.dimensions.visual.sources).toContain('self_report');

    let textState = startOnboarding('text');
    textState = answerCurrentQuestion(textState, 'Yes, larger text would help me');
    expect(textState.profile.preferences.textScale).toBe(1.3);
    expect(textState.questionIndex).toBe(choiceState.questionIndex);
  });

  it('supports skipping every question without inventing capability evidence', () => {
    let state = startOnboarding('choices');
    for (let index = 0; index < ONBOARDING_QUESTIONS.length; index += 1) {
      state = answerCurrentQuestion(state, 'skip');
    }

    expect(state.phase).toBe('calibration');
    expect(state.skippedQuestionIds).toHaveLength(ONBOARDING_QUESTIONS.length);
    expect(state.profile.dimensions.visual.sources).toEqual([]);
    expect(state.profile.preferences.textScale).toBe(1);
  });

  it('implements exactly three calibration tasks with weak evidence', () => {
    expect(CALIBRATION_TASKS).toEqual([
      'text_presentation',
      'control_size',
      'clutter_focus',
    ]);
    let state = startOnboarding('quick');
    state = applyCalibrationChoice(state, 'largest');
    state = applyCalibrationChoice(state, 'large');
    state = applyCalibrationChoice(state, 'focused');

    expect(state.phase).toBe('review');
    expect(state.profile.preferences).toMatchObject({
      textScale: 1.5,
      lineSpacing: 1.6,
      readingWidth: 'very_narrow',
      enlargeTargets: true,
      targetSizePx: 52,
      focusMode: true,
      hideDistractions: true,
    });
    expect(state.profile.dimensions.visual).toMatchObject({
      confidence: 0.3,
      sources: ['calibration'],
    });
  });

  it('produces a plain-language review from explicit preferences', () => {
    let state = startOnboarding('quick');
    state = applyCalibrationChoice(state, 'comfortable');
    state = applyCalibrationChoice(state, 'standard');
    state = applyCalibrationChoice(state, 'focused');

    expect(profileSummary(state.profile)).toEqual([
      'focus on primary content',
      'collapse distracting secondary content',
    ]);
  });
});
