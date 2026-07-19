import { createNeutralProfile } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import {
  clearExplicitPreference,
  resolveAdaptationPreferences,
  setExplicitPreference,
  withPreferenceLayer,
} from './preference-resolver';

function profileWithNeed(
  dimension: 'visual' | 'motor' | 'cognitive' | 'attention' | 'language',
  capacity: number,
  confidence = 1,
) {
  const profile = createNeutralProfile({
    id: `need-${dimension}`,
    name: `${dimension} need`,
    now: '2026-07-19T00:00:00.000Z',
  });
  profile.dimensions[dimension] = {
    capacity,
    confidence,
    sources: ['self_report'],
  };
  return profile;
}

describe('preference resolver', () => {
  it('derives safe visual recommendations from capacity and confidence', () => {
    const resolution = resolveAdaptationPreferences(profileWithNeed('visual', 0.2, 0.9));

    expect(resolution.preferences.textScale).toBe(1.5);
    expect(resolution.preferences.lineSpacing).toBe(1.55);
    expect(resolution.preferences.readingWidth).toBe('very_narrow');
    expect(resolution.sources.textScale).toBe('capability');
  });

  it('does not strongly adapt from a low-confidence capability score', () => {
    const resolution = resolveAdaptationPreferences(profileWithNeed('visual', 0.1, 0));

    expect(resolution.preferences.textScale).toBe(1);
    expect(resolution.preferences.readingWidth).toBe('normal');
    expect(resolution.sources.textScale).toBe('default');
  });

  it('composes recommendations from multiple capability dimensions', () => {
    const profile = profileWithNeed('visual', 0.35, 1);
    profile.dimensions.motor = { capacity: 0.35, confidence: 1, sources: ['self_report'] };
    profile.dimensions.attention = { capacity: 0.25, confidence: 1, sources: ['self_report'] };

    const resolution = resolveAdaptationPreferences(profile);

    expect(resolution.preferences.textScale).toBeGreaterThan(1);
    expect(resolution.preferences.enlargeTargets).toBe(true);
    expect(resolution.preferences.targetSizePx).toBe(52);
    expect(resolution.preferences.focusMode).toBe(true);
    expect(resolution.preferences.hideDistractions).toBe(true);
  });

  it('uses explicit > calibration > onboarding > capability > default precedence', () => {
    let profile = profileWithNeed('motor', 0.2, 1);
    profile = withPreferenceLayer(profile, 'onboarding', {
      enlargeTargets: true,
      targetSizePx: 48,
    });
    profile = withPreferenceLayer(profile, 'calibration', { targetSizePx: 60 });
    profile = setExplicitPreference(profile, 'targetSizePx', 44);

    const explicit = resolveAdaptationPreferences(profile);
    expect(explicit.preferences.targetSizePx).toBe(44);
    expect(explicit.sources.targetSizePx).toBe('explicit');

    const automatic = resolveAdaptationPreferences(clearExplicitPreference(profile, 'targetSizePx'));
    expect(automatic.preferences.targetSizePx).toBe(60);
    expect(automatic.sources.targetSizePx).toBe('calibration');
  });

  it('lets an explicit off choice override a strong capability recommendation', () => {
    let profile = profileWithNeed('attention', 0.1, 1);
    profile = setExplicitPreference(profile, 'hideDistractions', false);

    const resolution = resolveAdaptationPreferences(profile);
    expect(resolution.preferences.hideDistractions).toBe(false);
    expect(resolution.sources.hideDistractions).toBe('explicit');
  });
});
