import {
  DEMO_PROFILES,
  type FrictionSignal,
  type PersonalizedFriction,
} from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { calculateAuraFit } from './aura-fit';
import { personalizeFriction } from './personalized-friction';

const signals: FrictionSignal[] = [
  {
    id: 'local:interaction_target:1',
    category: 'interaction_target',
    targetIds: ['aura:n1'],
    severity: 0.8,
    confidence: 0.9,
    source: 'local',
    reason: 'The control is small.',
    critical: false,
  },
  {
    id: 'local:attention_clutter:2',
    category: 'attention_clutter',
    targetIds: ['aura:n2'],
    severity: 0.7,
    confidence: 0.8,
    source: 'local',
    reason: 'Secondary content competes with the main region.',
    critical: false,
  },
];

describe('AURA Fit', () => {
  it('produces different profile-specific scores for the same page', () => {
    const lowVision = DEMO_PROFILES[0];
    const motorCognitive = DEMO_PROFILES[1];
    if (!lowVision || !motorCognitive) throw new Error('Demo profiles are unavailable.');

    const lowVisionFit = calculateAuraFit(
      personalizeFriction(signals, lowVision),
    );
    const motorFit = calculateAuraFit(
      personalizeFriction(signals, motorCognitive),
    );

    expect(lowVisionFit.score).not.toBe(motorFit.score);
    expect(lowVisionFit.isHeuristic).toBe(true);
  });

  it('saturates repeated signals instead of collapsing the score linearly', () => {
    const profile = DEMO_PROFILES[1];
    if (!profile) throw new Error('Demo profile is unavailable.');
    const baseSignal = signals[0];
    if (!baseSignal) throw new Error('Friction fixture is unavailable.');
    const repeated = Array.from({ length: 20 }, (_, index) => ({
      signal: { ...baseSignal, id: `local:interaction_target:${index + 1}` },
      profileRelevance: 1,
      impact: 0.2,
      recommendationKeys: ['enlargeTargets'],
    })) satisfies PersonalizedFriction[];

    const fit = calculateAuraFit(repeated);
    expect(fit.score).toBeGreaterThan(0);
    expect(fit.categories[0]?.signalCount).toBe(20);
  });

  it('keeps semantic findings out of the comparable Fit score', () => {
    const profile = DEMO_PROFILES[2];
    if (!profile) throw new Error('Demo profile is unavailable.');
    const localOnly = calculateAuraFit(personalizeFriction(signals, profile));
    const semanticSignal: FrictionSignal = {
      id: 'semantic:attention_clutter:1',
      category: 'attention_clutter',
      targetIds: ['aura:n3'],
      severity: 1,
      confidence: 1,
      source: 'semantic_ai',
      reason: 'Semantic analysis found a distracting region.',
      critical: false,
    };

    const withSemantic = calculateAuraFit(
      personalizeFriction([...signals, semanticSignal], profile),
    );

    expect(withSemantic.score).toBe(localOnly.score);
    expect(withSemantic.categories).toEqual(localOnly.categories);
    expect(withSemantic.topFrictionIds).toEqual(localOnly.topFrictionIds);
  });
});
