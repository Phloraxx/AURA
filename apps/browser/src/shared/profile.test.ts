import { describe, expect, it } from 'vitest';

import {
  applyFunctionalAnswers,
  applyCalibrationChoices,
  completeBrowserProfile,
  createDefaultBrowserProfile,
  summarizeBrowserProfile,
} from './profile';

describe('functional profile answers', () => {
  it('combines support needs without assigning a diagnosis', () => {
    const profile = applyFunctionalAnswers(createDefaultBrowserProfile(), [
      { area: 'visual', difficulty: 'some_difficulty' },
      { area: 'motor', difficulty: 'a_lot_of_difficulty' },
      { area: 'attention', difficulty: 'some_difficulty' },
    ]);

    expect(profile.capabilities.visual).toBe('helpful');
    expect(profile.capabilities.motor).toBe('important');
    expect(profile.capabilities.attention).toBe('helpful');
    expect(profile.preferences.targetSizePx).toBe(60);
    expect(profile.preferences.reduceMotion).toBe(true);
    expect(profile.functionalAnswers).toHaveLength(3);
  });
});

describe('browser profile', () => {
  it('resolves visibly different preferences from different choices', () => {
    const base = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'test-profile',
    );
    const standard = applyCalibrationChoices(base, [
      { area: 'reading', choice: 'standard' },
      { area: 'interaction', choice: 'standard' },
      { area: 'attention', choice: 'standard' },
      {
        area: 'understanding',
        choice: 'balanced',
        preserveTechnicalTerms: true,
      },
    ]);
    const supported = applyCalibrationChoices(base, [
      { area: 'reading', choice: 'largest' },
      { area: 'interaction', choice: 'largest' },
      { area: 'attention', choice: 'step_by_step' },
      {
        area: 'understanding',
        choice: 'concise',
        preserveTechnicalTerms: false,
      },
    ]);

    expect(standard.preferences.textScale).toBe(1);
    expect(standard.preferences.targetSizePx).toBe(44);
    expect(supported.preferences.textScale).toBe(1.3);
    expect(supported.preferences.targetSizePx).toBe(60);
    expect(supported.preferences.reduceMotion).toBe(true);
    expect(supported.capabilities.attention).toBe('important');
    expect(supported).not.toEqual(standard);
  });

  it('creates a human summary without exposing numeric capability scores', () => {
    const profile = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'test-profile',
    );
    const summary = summarizeBrowserProfile(profile);
    const completed = completeBrowserProfile(
      profile,
      summary,
      '2026-07-24T00:01:00.000Z',
    );

    expect(summary).toContain('technical terms preserved');
    expect(completed.completedAt).toBe('2026-07-24T00:01:00.000Z');
    expect(completed.learnedPreferences).toEqual([]);
  });
});
