import { describe, expect, it } from 'vitest';

import type { PageModel } from './page-model';
import { createDefaultBrowserProfile } from './profile';
import type { WcagScanResult } from './wcag';
import { calculateAuraFit } from './aura-fit';

function page(): PageModel {
  const controls = Array.from({ length: 24 }, (_, index) => ({
    accessibleName: index < 20 ? `Action ${index + 1}` : null,
    auraId: `control-${index}`,
    category: 'control' as const,
    childCount: 0,
    display: 'block',
    fontSizePx: 14,
    fontWeight: '400',
    formAuraId: null,
    headingLevel: null,
    href: null,
    inViewport: true,
    inputType: 'button',
    interactive: true,
    landmark: null,
    lineHeightPx: 18,
    position: 'static',
    rect: { height: 28, width: 80, x: 0, y: index * 32 },
    repetitionKey: 'actions',
    role: 'button',
    score: 10,
    states: {
      checked: null,
      disabled: false,
      expanded: null,
      selected: null,
    },
    tag: 'button',
    text: `Action ${index + 1}`,
    textLength: 8,
    visible: true,
  }));
  return {
    capturedAt: '2026-07-25T00:00:00.000Z',
    elements: controls,
    extractionHealth: {
      enoughTargets: true,
      formLabelCoverage: 1,
      hasHeading: true,
      hasInteractive: true,
      hasPrimaryRegion: false,
      score: 0.9,
    },
    forms: [],
    metrics: {
      candidateCount: 24,
      captureDurationMs: 1,
      mutationCount: 0,
      selectedCount: 24,
      trigger: 'manual',
    },
    pageId: 'page-1',
    privacy: {
      hasEditableControl: false,
      hasNonEmptyEditableControl: false,
      hasPasswordControl: false,
    },
    regions: [],
    repeatedStructures: [
      {
        category: 'control',
        count: 24,
        exampleNames: ['Action 1'],
        key: 'actions',
        representativeAuraIds: ['control-0'],
      },
    ],
    revision: 1,
    schemaVersion: 1,
    title: 'Dense actions',
    url: 'https://example.test',
    viewport: { height: 800, scrollX: 0, scrollY: 0, width: 1200 },
    visibleAuraIds: controls.map((control) => control.auraId),
  };
}

function scan(): WcagScanResult {
  return {
    failedRules: 1,
    indicator: 97,
    issues: [
      {
        areas: ['motor'],
        help: 'Targets must have sufficient size or spacing',
        helpUrl: 'https://example.test/help',
        id: 'target-size',
        impact: 'serious',
        nodeCount: 24,
      },
    ],
    needsReviewRules: 1,
    pageTitle: 'Dense actions',
    pageUrl: 'https://example.test',
    passedRules: 29,
    reviewItems: [
      {
        areas: ['cognitive'],
        help: 'Review landmarks',
        helpUrl: 'https://example.test/review',
        id: 'landmark-review',
        impact: 'moderate',
        nodeCount: 1,
      },
    ],
    scannedAt: '2026-07-25T00:00:00.000Z',
  };
}

describe('calculateAuraFit', () => {
  it('communicates dense repeated barriers more strongly than a rule pass ratio', () => {
    const profile = createDefaultBrowserProfile();
    profile.capabilities.motor = 'important';
    profile.preferences.informationDensity = 'calm';
    profile.preferences.targetSizePx = 52;

    const result = calculateAuraFit({
      adaptation: null,
      page: page(),
      profile,
      scan: scan(),
    });

    expect(result.score).toBeLessThan(80);
    expect(result.confidence).toBe('limited');
    expect(
      result.dimensions.find((item) => item.id === 'interaction')?.findings[0],
    ).toContain('24 of 24 controls');
  });

  it('shows bounded evidence-based improvement when AURA is active', () => {
    const profile = createDefaultBrowserProfile();
    profile.capabilities.attention = 'important';
    profile.capabilities.motor = 'important';
    profile.preferences.informationDensity = 'calm';
    profile.preferences.targetSizePx = 52;
    profile.preferences.textScale = 1.15;

    const before = calculateAuraFit({
      adaptation: null,
      page: page(),
      profile,
      scan: scan(),
    });
    const after = calculateAuraFit({
      adaptation: {
        active: true,
        changedTargetCount: 24,
        localSelectedTargetCount: 8,
        preset: 'clear_calm',
        semanticAppliedCount: 4,
      },
      page: page(),
      profile,
      scan: {
        ...scan(),
        failedRules: 0,
        issues: [],
        passedRules: 30,
        scannedAt: '2026-07-25T00:01:00.000Z',
      },
    });

    expect(after.score).toBeGreaterThan(before.score);
    expect(after.score).toBeLessThanOrEqual(100);
  });
});
