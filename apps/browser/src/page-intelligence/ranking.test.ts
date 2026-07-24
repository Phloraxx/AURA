import { describe, expect, it } from 'vitest';

import type { PageElementCategory } from '../shared/page-model';
import {
  calculateExtractionHealth,
  type RankablePageElement,
  selectBalancedElements,
  summarizeRepeatedStructures,
} from './ranking';

function element(
  auraId: string,
  category: PageElementCategory,
  overrides: Partial<RankablePageElement> = {},
): RankablePageElement {
  return {
    accessibleName: `${category} ${auraId}`,
    auraId,
    category,
    childCount: 0,
    display: 'block',
    fontSizePx: 16,
    fontWeight: '400',
    formAuraId: null,
    headingLevel: category === 'heading' ? 2 : null,
    href: null,
    inViewport: true,
    inputType: null,
    insidePrimaryContent: false,
    insideUtilityRegion: false,
    interactive: category === 'control',
    landmark: category === 'region' ? 'main' : null,
    lineHeightPx: 24,
    position: 'static',
    rect: { height: 40, width: 200, x: 0, y: 0 },
    repetitionKey: null,
    role: category === 'heading' ? 'heading' : null,
    score: 0,
    sourceOrder: Number(auraId.replace(/\D/g, '')) || 0,
    states: {
      checked: null,
      disabled: false,
      expanded: null,
      selected: null,
    },
    tag: category === 'heading' ? 'h2' : 'div',
    text: `${category} ${auraId}`,
    textLength: 40,
    visible: true,
    visualProminence: 0.4,
    ...overrides,
  };
}

describe('selectBalancedElements', () => {
  it('selects high-value categories independent of DOM order', () => {
    const utilityLinks = Array.from({ length: 250 }, (_, index) =>
      element(`aura-${index + 1}`, 'navigation', {
        accessibleName: `Utility link ${index + 1}`,
        insideUtilityRegion: true,
        repetitionKey: 'nav|link',
        sourceOrder: index,
        tag: 'a',
      }),
    );
    const lateHeading = element('aura-999', 'heading', {
      accessibleName: 'Primary article heading',
      insidePrimaryContent: true,
      sourceOrder: 999,
      textLength: 80,
    });

    const selected = selectBalancedElements([...utilityLinks, lateHeading]);

    expect(selected.some((candidate) => candidate.auraId === 'aura-999')).toBe(
      true,
    );
    expect(
      selected.filter((candidate) => candidate.repetitionKey === 'nav|link'),
    ).toHaveLength(3);
  });

  it('summarizes repeated patterns with representative targets', () => {
    const repeated = Array.from({ length: 8 }, (_, index) =>
      element(`aura-${index + 1}`, 'control', {
        repetitionKey: 'product-card|button',
      }),
    );

    expect(summarizeRepeatedStructures(repeated)).toEqual([
      expect.objectContaining({
        count: 8,
        key: 'product-card|button',
        representativeAuraIds: ['aura-1', 'aura-2', 'aura-3'],
      }),
    ]);
  });
});

describe('calculateExtractionHealth', () => {
  it('reports semantic and form-label coverage', () => {
    const elements = [
      element('aura-main', 'region', { landmark: 'main', tag: 'main' }),
      element('aura-heading', 'heading'),
      element('aura-form', 'form'),
      element('aura-control-1', 'control', {
        accessibleName: 'Email',
        formAuraId: 'aura-form',
      }),
      element('aura-control-2', 'control', {
        accessibleName: null,
        formAuraId: 'aura-form',
      }),
      ...Array.from({ length: 4 }, (_, index) =>
        element(`aura-text-${index}`, 'text'),
      ),
    ];

    expect(calculateExtractionHealth(elements)).toEqual({
      enoughTargets: true,
      formLabelCoverage: 0.5,
      hasHeading: true,
      hasInteractive: true,
      hasPrimaryRegion: true,
      score: 0.8,
    });
  });
});
