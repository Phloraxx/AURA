import { describe, expect, it } from 'vitest';

import {
  createNeutralProfile,
  onboardingRequestSchema,
  onboardingResponseSchema,
} from './index.js';

describe('onboarding API contracts', () => {
  const profile = createNeutralProfile({
    id: 'api-contract',
    name: 'API contract',
    now: '2026-07-18T12:00:00.000Z',
  });

  it('accepts constrained profile patches', () => {
    expect(
      onboardingResponseSchema.parse({
        assistantMessage: 'Would larger controls help?',
        profilePatch: { preferences: { enlargeTargets: true, targetSizePx: 52 } },
        confidence: 0.8,
        suggestedCalibrationTask: 'control_size',
        onboardingComplete: false,
      }).profilePatch,
    ).toEqual({ preferences: { enlargeTargets: true, targetSizePx: 52 } });
  });

  it('rejects out-of-range model patches and unbounded transcripts', () => {
    expect(
      onboardingResponseSchema.safeParse({
        assistantMessage: 'Invalid patch',
        profilePatch: {
          dimensions: {
            visual: { capacity: -1, confidence: 2, sources: ['self_report'] },
          },
        },
        confidence: 2,
        suggestedCalibrationTask: null,
        onboardingComplete: false,
      }).success,
    ).toBe(false);

    expect(
      onboardingRequestSchema.safeParse({
        profile,
        transcript: Array.from({ length: 17 }, () => ({
          role: 'user',
          content: 'bounded',
        })),
        userResponse: 'Hello',
        askedAreas: [],
      }).success,
    ).toBe(false);
  });
});
