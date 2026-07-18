import type {
  AdaptationPreferences,
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
  preferences: Partial<AdaptationPreferences>,
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
    preferences: {
      ...neutral.preferences,
      ...preferences,
    },
  });
}

export const DEMO_PROFILES: readonly CapabilityProfile[] = [
  createDemoProfile(
    'demo-low-vision',
    'Low vision focused',
    [['visual', 0.35]],
    {
      textScale: 1.5,
      lineSpacing: 1.6,
      readingWidth: 'narrow',
      contrast: 'enhanced',
      enlargeTargets: true,
      targetSizePx: 48,
    },
  ),
  createDemoProfile(
    'demo-motor-cognitive',
    'Motor and cognitive load focused',
    [
      ['motor', 0.4],
      ['cognitive', 0.5],
    ],
    {
      lineSpacing: 1.4,
      readingWidth: 'narrow',
      focusMode: true,
      enlargeTargets: true,
      targetSizePx: 56,
      stepByStepForms: true,
      clarifyControls: true,
    },
  ),
  createDemoProfile(
    'demo-attention-language',
    'Attention and language focused',
    [
      ['attention', 0.35],
      ['language', 0.45],
    ],
    {
      lineSpacing: 1.35,
      readingWidth: 'very_narrow',
      reduceMotion: true,
      focusMode: true,
      simplifyLanguage: true,
      hideDistractions: true,
      clarifyControls: true,
    },
  ),
] as const;
