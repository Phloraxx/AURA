import {
  DEMO_PROFILES,
  EMPTY_PAGE_SIGNALS,
  createNeutralProfile,
} from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { createDeterministicPolicy } from './policy-engine';

function kindsFor(profileIndex: number) {
  const profile = DEMO_PROFILES[profileIndex];
  if (!profile) throw new Error('Demo profile fixture is missing.');
  return createDeterministicPolicy(profile, {
    ...EMPTY_PAGE_SIGNALS,
    mainContentIds: ['aura:n1'],
  }).instructions.map(({ kind }) => kind);
}

describe('createDeterministicPolicy', () => {
  it('produces clearly different plans for different profiles', () => {
    const lowVision = kindsFor(0);
    const attentionLanguage = kindsFor(2);

    expect(lowVision).toEqual([
      'increaseTextScale',
      'increaseLineSpacing',
      'limitReadingWidth',
      'improveContrast',
      'enlargeTargets',
      'enhanceFocusIndicators',
    ]);
    expect(attentionLanguage).toEqual([
      'increaseLineSpacing',
      'limitReadingWidth',
      'reduceMotion',
      'enhanceFocusIndicators',
      'focusMainContent',
    ]);
  });

  it('uses resolved explicit preferences rather than capability thresholds', () => {
    const profile = createNeutralProfile({
      id: 'explicit-off',
      name: 'Explicit choices',
      now: '2026-07-18T12:00:00.000Z',
    });
    profile.dimensions.visual = {
      capacity: 0.1,
      confidence: 1,
      sources: ['self_report'],
    };

    const kinds = createDeterministicPolicy(profile, EMPTY_PAGE_SIGNALS).instructions.map(
      ({ kind }) => kind,
    );

    expect(kinds).toEqual(['enhanceFocusIndicators']);
    expect(kinds).not.toContain('increaseTextScale');
    expect(kinds).not.toContain('improveContrast');
  });

  it('passes registered main-content IDs only to targeted instructions', () => {
    const profile = DEMO_PROFILES[2];
    if (!profile) throw new Error('Demo profile fixture is missing.');
    const plan = createDeterministicPolicy(profile, {
      ...EMPTY_PAGE_SIGNALS,
      mainContentIds: ['aura:n4'],
    });

    expect(
      plan.instructions.find(({ kind }) => kind === 'focusMainContent')?.targetIds,
    ).toEqual(['aura:n4']);
  });
});
