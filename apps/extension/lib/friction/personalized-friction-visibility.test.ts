import { DEMO_PROFILES, type FrictionSignal } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { resolveAdaptationPreferences } from '../profile/preference-resolver';
import { personalizeFriction, relevantPersonalizedFriction } from './personalized-friction';

const signals: FrictionSignal[] = [
  {
    id: 'local:readability:1',
    category: 'readability',
    targetIds: ['aura:n1'],
    severity: 0.8,
    confidence: 0.9,
    source: 'local',
    reason: 'Dense text.',
    critical: false,
  },
  {
    id: 'local:interaction_target:2',
    category: 'interaction_target',
    targetIds: ['aura:n2'],
    severity: 0.8,
    confidence: 0.9,
    source: 'local',
    reason: 'Small target.',
    critical: false,
  },
  {
    id: 'local:attention_clutter:3',
    category: 'attention_clutter',
    targetIds: ['aura:n3'],
    severity: 0.8,
    confidence: 0.9,
    source: 'local',
    reason: 'Competing content.',
    critical: false,
  },
  {
    id: 'local:language_complexity:4',
    category: 'language_complexity',
    targetIds: ['aura:n4'],
    severity: 0.8,
    confidence: 0.9,
    source: 'local',
    reason: 'Complex wording.',
    critical: false,
  },
];

function visibleIds(profileIndex: number): string[] {
  const profile = DEMO_PROFILES[profileIndex];
  if (!profile) throw new Error('Demo profile is unavailable.');
  const resolution = resolveAdaptationPreferences(profile);
  return relevantPersonalizedFriction(
    personalizeFriction(signals, { ...profile, preferences: resolution.preferences }),
  ).map(({ signal }) => signal.id);
}

describe('personalized friction visibility', () => {
  it('shows different Lens friction for the same page when the active profile changes', () => {
    const lowVision = visibleIds(0);
    const motorCognitive = visibleIds(1);
    const attentionLanguage = visibleIds(2);

    expect(lowVision).toContain('local:readability:1');
    expect(lowVision).not.toContain('local:attention_clutter:3');
    expect(attentionLanguage).toContain('local:attention_clutter:3');
    expect(attentionLanguage).toContain('local:language_complexity:4');
    expect(motorCognitive).toContain('local:interaction_target:2');
    expect(new Set([lowVision.join(','), motorCognitive.join(','), attentionLanguage.join(',')]).size).toBe(3);
  });
});
