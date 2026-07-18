import { describe, expect, it } from 'vitest';

import { DEMO_PROFILES } from './demo-profiles';
import {
  CAPABILITY_DIMENSION_NAMES,
  capabilityProfileSchema,
  createNeutralProfile,
} from './profile';

describe('capabilityProfileSchema', () => {
  it('creates a neutral, non-diagnostic profile', () => {
    const profile = createNeutralProfile({
      id: 'profile-1',
      name: 'My profile',
      now: '2026-07-18T12:00:00.000Z',
    });

    expect(Object.keys(profile.dimensions)).toEqual(CAPABILITY_DIMENSION_NAMES);
    expect(profile.preferences).toMatchObject({
      textScale: 1,
      reduceMotion: false,
      hideDistractions: false,
    });
    expect(profile.dimensions.visual).toEqual({
      capacity: 1,
      confidence: 0,
      sources: [],
    });
  });

  it.each([
    ['capacity below zero', { capacity: -0.1, confidence: 0 }],
    ['capacity above one', { capacity: 1.1, confidence: 0 }],
    ['confidence below zero', { capacity: 1, confidence: -0.1 }],
    ['confidence above one', { capacity: 1, confidence: 1.1 }],
  ])('rejects an invalid %s', (_label, invalidDimension) => {
    const profile = createNeutralProfile({
      id: 'profile-1',
      name: 'My profile',
      now: '2026-07-18T12:00:00.000Z',
    });

    expect(() =>
      capabilityProfileSchema.parse({
        ...profile,
        dimensions: {
          ...profile.dimensions,
          visual: {
            ...profile.dimensions.visual,
            ...invalidDimension,
          },
        },
      }),
    ).toThrow();
  });

  it('provides three valid and visibly distinct demo profiles', () => {
    expect(DEMO_PROFILES).toHaveLength(3);
    expect(DEMO_PROFILES.map(({ id }) => id)).toEqual([
      'demo-low-vision',
      'demo-motor-cognitive',
      'demo-attention-language',
    ]);
    for (const profile of DEMO_PROFILES) {
      expect(capabilityProfileSchema.safeParse(profile).success).toBe(true);
    }
    expect(new Set(DEMO_PROFILES.map(({ preferences }) => preferences))).toHaveLength(
      3,
    );
  });
});
