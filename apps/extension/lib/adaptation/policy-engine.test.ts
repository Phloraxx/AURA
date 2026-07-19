import {
  DEMO_PROFILES,
  EMPTY_PAGE_SIGNALS,
  createNeutralProfile,
} from '@aura/shared';
import { describe, expect, it } from 'vitest';

import {
  resolveAdaptationPreferences,
  setExplicitPreference,
} from '../profile/preference-resolver';
import { createDeterministicPolicy, createSemanticPolicy } from './policy-engine';

function kindsFor(profileIndex: number) {
  const profile = DEMO_PROFILES[profileIndex];
  if (!profile) throw new Error('Demo profile fixture is missing.');
  return createDeterministicPolicy(resolveAdaptationPreferences(profile), {
    ...EMPTY_PAGE_SIGNALS,
    mainContentIds: ['aura:n1'],
  }).instructions.map(({ kind }) => kind);
}

describe('createDeterministicPolicy', () => {
  it('produces clearly different plans from capability-driven profiles', () => {
    const lowVision = kindsFor(0);
    const attentionLanguage = kindsFor(2);

    expect(lowVision).toEqual([
      'increaseTextScale',
      'increaseLineSpacing',
      'limitReadingWidth',
      'improveContrast',
      'enhanceFocusIndicators',
    ]);
    expect(attentionLanguage).toEqual([
      'reduceMotion',
      'enhanceFocusIndicators',
      'focusMainContent',
    ]);
  });

  it('respects explicit off choices over capability recommendations', () => {
    let profile = createNeutralProfile({
      id: 'explicit-off',
      name: 'Explicit choices',
      now: '2026-07-18T12:00:00.000Z',
    });
    profile.dimensions.visual = {
      capacity: 0.1,
      confidence: 1,
      sources: ['self_report'],
    };
    profile = setExplicitPreference(profile, 'textScale', 1);
    profile = setExplicitPreference(profile, 'lineSpacing', 1);
    profile = setExplicitPreference(profile, 'readingWidth', 'normal');

    const kinds = createDeterministicPolicy(
      resolveAdaptationPreferences(profile),
      EMPTY_PAGE_SIGNALS,
    ).instructions.map(({ kind }) => kind);

    expect(kinds).toEqual(['enhanceFocusIndicators']);
    expect(kinds).not.toContain('increaseTextScale');
    expect(kinds).not.toContain('limitReadingWidth');
  });

  it('passes registered main-content IDs only to targeted instructions', () => {
    const profile = DEMO_PROFILES[2];
    if (!profile) throw new Error('Demo profile fixture is missing.');
    const plan = createDeterministicPolicy(resolveAdaptationPreferences(profile), {
      ...EMPTY_PAGE_SIGNALS,
      mainContentIds: ['aura:n4'],
    });

    expect(
      plan.instructions.find(({ kind }) => kind === 'focusMainContent')?.targetIds,
    ).toEqual(['aura:n4']);
  });
});

describe('createSemanticPolicy', () => {
  it('composes constrained semantic primitives from resolved preferences', () => {
    const profile = DEMO_PROFILES[2];
    if (!profile) throw new Error('Demo profile is missing.');
    const plan = createSemanticPolicy(
      resolveAdaptationPreferences(profile),
      {
        mainContent: [],
        primaryActions: [{ id: 'aura:n1', confidence: 0.9, reason: 'Primary' }],
        navigation: [],
        distractions: [{ id: 'aura:n2', confidence: 0.9, reason: 'Secondary' }],
        ambiguousControls: [
          {
            id: 'aura:n3',
            confidence: 0.9,
            reason: 'Missing name',
            suggestedLabel: 'Open options',
          },
        ],
        complexTextBlocks: [{ id: 'aura:n4', confidence: 0.9, reason: 'Complex' }],
        formGroups: [],
        warnings: [],
      },
      {
        'aura:n4': {
          simplifiedText: 'Shorter instructions.',
          requiresOriginal: false,
          warnings: [],
        },
      },
    );

    expect(plan.instructions.map(({ kind }) => kind)).toEqual([
      'collapseDistractions',
      'highlightPrimaryAction',
      'clarifyAmbiguousControls',
      'simplifyText',
    ]);
  });

  it('adds a guided form plan for cognitive form-step recommendations', () => {
    const profile = DEMO_PROFILES[1];
    if (!profile) throw new Error('Demo profile is missing.');
    const plan = createSemanticPolicy(resolveAdaptationPreferences(profile), {
      mainContent: [],
      primaryActions: [],
      navigation: [],
      distractions: [],
      ambiguousControls: [],
      complexTextBlocks: [],
      formGroups: [
        { id: 'aura:n1', confidence: 0.9, reason: 'Contact details' },
        { id: 'aura:n3', confidence: 0.9, reason: 'Address details' },
      ],
      warnings: [],
    });

    expect(plan.instructions.find(({ kind }) => kind === 'guideFormSteps')).toMatchObject({
      targetIds: ['aura:n1', 'aura:n3'],
      params: {
        groups: [
          { label: 'Contact details', elementIds: ['aura:n1'] },
          { label: 'Address details', elementIds: ['aura:n3'] },
        ],
      },
    });
  });
});
