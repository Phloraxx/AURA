import { describe, expect, it } from 'vitest';

import type { PageElement, PageModel } from '../../shared/page-model';
import { createDefaultBrowserProfile } from '../../shared/profile';
import type { PageAnalysisModelOutput } from '../../shared/semantic-analysis';
import { validatePageAnalysis } from './validate-page-analysis';

function element(
  auraId: string,
  overrides: Partial<PageElement> = {},
): PageElement {
  return {
    accessibleName: null,
    auraId,
    category: 'region',
    childCount: 0,
    display: 'block',
    fontSizePx: 16,
    fontWeight: '400',
    formAuraId: null,
    headingLevel: null,
    href: null,
    inViewport: true,
    inputType: null,
    interactive: false,
    landmark: null,
    lineHeightPx: 24,
    position: 'static',
    rect: { height: 100, width: 600, x: 0, y: 0 },
    repetitionKey: null,
    role: null,
    score: 1,
    states: {
      checked: null,
      disabled: false,
      expanded: null,
      selected: null,
    },
    tag: 'section',
    text: null,
    textLength: 0,
    visible: true,
    ...overrides,
  };
}

function page(elements: PageElement[]): PageModel {
  return {
    capturedAt: '2026-07-24T00:00:00.000Z',
    elements,
    extractionHealth: {
      enoughTargets: true,
      formLabelCoverage: 1,
      hasHeading: true,
      hasInteractive: true,
      hasPrimaryRegion: true,
      score: 1,
    },
    forms: [],
    metrics: {
      candidateCount: elements.length,
      captureDurationMs: 1,
      mutationCount: 0,
      selectedCount: elements.length,
      trigger: 'manual',
    },
    pageId: 'page-1',
    privacy: {
      hasEditableControl: false,
      hasNonEmptyEditableControl: false,
      hasPasswordControl: false,
    },
    regions: [],
    repeatedStructures: [],
    revision: 3,
    schemaVersion: 1,
    title: 'Fixture',
    url: 'https://example.com/',
    viewport: { height: 900, scrollX: 0, scrollY: 0, width: 1200 },
    visibleAuraIds: elements.map((item) => item.auraId),
  };
}

function output(): PageAnalysisModelOutput {
  return {
    confidence: 0.9,
    guide: {
      steps: [
        { auraId: 'action', instruction: 'Continue with the application.' },
        { auraId: 'missing', instruction: 'Invented target.' },
      ],
      title: 'Application',
    },
    highlights: [
      { auraId: 'action', confidence: 0.9, reason: 'Primary action' },
      { auraId: 'missing', confidence: 1, reason: 'Invented target' },
    ],
    importantFacts: [
      { auraId: 'main', label: 'Deadline', value: '28 July' },
      { auraId: 'missing', label: 'Invalid', value: 'No' },
    ],
    pagePurpose: 'Apply for a programme',
    primaryTargets: [
      { auraId: 'main', confidence: 0.95, reason: 'Main content' },
    ],
    secondaryTargets: [
      {
        action: 'collapse',
        auraId: 'aside',
        confidence: 0.9,
        reason: 'Secondary recommendations',
      },
      {
        action: 'collapse',
        auraId: 'main',
        confidence: 1,
        reason: 'Unsafe model proposal',
      },
      {
        action: 'deemphasize',
        auraId: 'navigation',
        confidence: 0.9,
        reason: 'Navigation',
      },
    ],
    simplifications: [
      {
        auraId: 'dense',
        confidence: 0.9,
        reason: 'Dense wording',
        simplifiedText: 'Submit the form by 28 July.',
      },
      {
        auraId: 'action',
        confidence: 1,
        reason: 'Unsafe control rewrite',
        simplifiedText: 'Click.',
      },
    ],
    summary: 'Complete the application before the deadline.',
  };
}

describe('page analysis validation', () => {
  const model = page([
    element('main', { landmark: 'main', tag: 'main' }),
    element('aside', { landmark: 'complementary', tag: 'aside' }),
    element('navigation', {
      category: 'navigation',
      landmark: 'navigation',
      tag: 'nav',
    }),
    element('dense', {
      category: 'text',
      tag: 'p',
      text: 'Dense application wording.',
      textLength: 160,
    }),
    element('action', {
      accessibleName: 'Continue',
      category: 'control',
      interactive: true,
      role: 'button',
      tag: 'button',
    }),
  ]);

  it('rejects invented, primary, and unsafe targets', () => {
    const profile = createDefaultBrowserProfile();
    profile.preferences.informationDensity = 'calm';
    const plan = validatePageAnalysis(output(), model, profile);

    expect(plan.primaryTargetIds).toEqual(['main']);
    expect(plan.collapseTargetIds).toEqual(['aside']);
    expect(plan.highlightTargetIds).toEqual(['action']);
    expect(plan.simplifications).toEqual([
      {
        auraId: 'dense',
        simplifiedText: 'Submit the form by 28 July.',
      },
    ]);
    expect(plan.importantFacts).toHaveLength(1);
    expect(plan.guide?.steps).toHaveLength(1);
  });

  it('honors an explicit request to preserve navigation', () => {
    const profile = createDefaultBrowserProfile();
    profile.learnedPreferences = ['Keep navigation visible on every page.'];
    const plan = validatePageAnalysis(output(), model, profile);

    expect(plan.deemphasizeTargetIds).not.toContain('navigation');
  });

  it('downgrades collapse when the profile keeps standard density', () => {
    const plan = validatePageAnalysis(
      output(),
      model,
      createDefaultBrowserProfile(),
    );

    expect(plan.collapseTargetIds).toEqual([]);
    expect(plan.deemphasizeTargetIds).toContain('aside');
  });

  it('keeps low-confidence analysis to summary-only output', () => {
    const uncertain = output();
    uncertain.confidence = 0.4;
    const plan = validatePageAnalysis(
      uncertain,
      model,
      createDefaultBrowserProfile(),
    );

    expect(plan.primaryTargetIds).toEqual([]);
    expect(plan.deemphasizeTargetIds).toEqual([]);
    expect(plan.collapseTargetIds).toEqual([]);
    expect(plan.highlightTargetIds).toEqual([]);
    expect(plan.simplifications).toEqual([]);
    expect(plan.guide).toBeNull();
  });
});
