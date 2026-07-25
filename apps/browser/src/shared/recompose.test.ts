import { describe, expect, it } from 'vitest';

import { createDefaultBrowserProfile } from './profile';
import { profileForRecomposePreset } from './recompose';

describe('Recompose judge profiles', () => {
  it('does not mutate the learned profile', () => {
    const original = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-1',
    );
    original.learnedPreferences = ['Keep technical terminology.'];
    const snapshot = structuredClone(original);

    const clear = profileForRecomposePreset(original, 'clear_calm');

    expect(original).toEqual(snapshot);
    expect(clear).not.toBe(original);
    expect(clear.learnedPreferences).toEqual(['Keep technical terminology.']);
  });

  it('creates materially different event experiences without diagnostic labels', () => {
    const original = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-1',
    );

    const calm = profileForRecomposePreset(original, 'clear_calm');
    const visual = profileForRecomposePreset(original, 'easier_to_see');
    const motor = profileForRecomposePreset(original, 'easy_to_control');
    const steps = profileForRecomposePreset(original, 'step_by_step');

    expect(calm.preferences.informationDensity).toBe('calm');
    expect(calm.preferences.reduceMotion).toBe(true);
    expect(visual.preferences.textScale).toBeGreaterThanOrEqual(1.35);
    expect(visual.preferences.targetSizePx).toBe(60);
    expect(motor.capabilities.motor).toBe('important');
    expect(motor.preferences.targetSizePx).toBe(60);
    expect(steps.preferences.informationDensity).toBe('step_by_step');
    expect(steps.capabilities.cognitive).toBe('important');
  });

  it('keeps the personalized option identical in behavior but cloned', () => {
    const original = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-1',
    );
    const personalized = profileForRecomposePreset(original, 'personalized');

    expect(personalized).toEqual(original);
    expect(personalized).not.toBe(original);
  });
});
