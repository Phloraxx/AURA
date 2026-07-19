import { describe, expect, it } from 'vitest';

import type { PageRepresentation, SemanticPageAnalysis } from '@aura/shared';

import { validateSemanticAnalysisForPage } from './semantic-validation';

const page: PageRepresentation = {
  title: 'Checkout',
  truncated: false,
  elements: [
    { id: 'aura:n1', kind: 'landmark', tag: 'main', critical: false },
    { id: 'aura:n2', kind: 'control', tag: 'button', critical: true },
  ],
};

function analysis(): SemanticPageAnalysis {
  return {
    mainContent: [{ id: 'aura:n1', confidence: 0.9, reason: 'Main landmark' }],
    primaryActions: [],
    navigation: [],
    distractions: [
      { id: 'aura:n2', confidence: 0.99, reason: 'Incorrectly classified' },
    ],
    ambiguousControls: [],
    complexTextBlocks: [],
    formGroups: [],
    warnings: [],
  };
}

describe('semantic page analysis validation', () => {
  it('rejects invented IDs', () => {
    const value = analysis();
    value.mainContent[0] = {
      id: 'aura:n999',
      confidence: 1,
      reason: 'Invented target',
    };

    expect(() => validateSemanticAnalysisForPage(value, page)).toThrow(/unknown/u);
  });

  it('filters low-confidence and critical targets', () => {
    const value = analysis();
    value.primaryActions.push({
      id: 'aura:n1',
      confidence: 0.2,
      reason: 'Weak guess',
    });
    value.formGroups.push(
      { id: 'aura:n1', confidence: 0.2, reason: 'Weak form guess' },
      { id: 'aura:n2', confidence: 0.99, reason: 'Critical form group' },
    );

    const validated = validateSemanticAnalysisForPage(value, page);

    expect(validated.mainContent).toHaveLength(1);
    expect(validated.primaryActions).toHaveLength(0);
    expect(validated.distractions).toHaveLength(0);
    expect(validated.formGroups).toHaveLength(0);
  });
});
