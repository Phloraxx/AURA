import type {
  AdaptationPreferencePatch,
  CapabilityDimensions,
  CapabilityProfile,
} from './profile.js';
import {
  capabilityProfileSchema,
  createNeutralProfile,
} from './profile.js';

const SEEDED_AT = '2026-07-18T00:00:00.000Z';

function withDimension(
  dimensions: CapabilityDimensions,
  name: keyof CapabilityDimensions,
  capacity: number,
): CapabilityDimensions {
  return {
    ...dimensions,
    [name]: {
      capacity,
      confidence: 0.9,
      sources: ['self_report'],
    },
  };
}

function createDemoProfile(
  id: string,
  name: string,
  dimensions: Array<[keyof CapabilityDimensions, number]>,
  onboardingPreferences: AdaptationPreferencePatch = {},
): CapabilityProfile {
  const neutral = createNeutralProfile({ id, name, now: SEEDED_AT });
  const resolvedDimensions = dimensions.reduce(
    (current, [dimension, capacity]) =>
      withDimension(current, dimension, capacity),
    neutral.dimensions,
  );

  return capabilityProfileSchema.parse({
    ...neutral,
    dimensions: resolvedDimensions,
    preferenceLayers: {
      ...neutral.preferenceLayers,
      onboarding: onboardingPreferences,
    },
  });
}

export const DEMO_PROFILES: readonly CapabilityProfile[] = [
  createDemoProfile(
    'demo-low-vision',
    'Low vision focused',
    [['visual', 0.25]],
    {
      contrast: 'enhanced',
    },
  ),
  createDemoProfile(
    'demo-motor-cognitive',
    'Motor and cognitive load focused',
    [
      ['motor', 0.3],
      ['cognitive', 0.35],
    ],
  ),
  createDemoProfile(
    'demo-attention-language',
    'Attention and language focused',
    [
      ['attention', 0.25],
      ['language', 0.35],
    ],
  ),
] as const;
