import { describe, expect, it } from 'vitest';

import type { PageElement, PageModel } from '../shared/page-model';
import type { SemanticPlan } from '../shared/semantic-analysis';
import {
  buildPageRecomposePlan,
  inferPresetFromSettings,
  refinePageRecomposeWithSemantic,
} from './plan';

function element(
  auraId: string,
  overrides: Partial<PageElement> = {},
): PageElement {
  const text = overrides.text ?? overrides.accessibleName ?? auraId;
  return {
    accessibleName: overrides.accessibleName ?? text,
    auraId,
    category: overrides.category ?? 'control',
    childCount: overrides.childCount ?? 0,
    display: overrides.display ?? 'block',
    fontSizePx: overrides.fontSizePx ?? 16,
    fontWeight: overrides.fontWeight ?? '400',
    formAuraId: overrides.formAuraId ?? null,
    headingLevel: overrides.headingLevel ?? null,
    href: overrides.href ?? null,
    inViewport: overrides.inViewport ?? true,
    inputType: overrides.inputType ?? null,
    interactive: overrides.interactive ?? true,
    landmark: overrides.landmark ?? null,
    lineHeightPx: overrides.lineHeightPx ?? 22,
    position: overrides.position ?? 'static',
    rect: overrides.rect ?? { height: 60, width: 320, x: 20, y: 20 },
    repetitionKey: overrides.repetitionKey ?? null,
    role: overrides.role ?? 'button',
    score: overrides.score ?? 10,
    states: overrides.states ?? {
      checked: null,
      disabled: false,
      expanded: null,
      selected: null,
    },
    tag: overrides.tag ?? 'button',
    text,
    textLength: overrides.textLength ?? text.length,
    visible: overrides.visible ?? true,
  };
}

function listingPage(): PageModel {
  const elements = [
    element('heading', {
      accessibleName: 'Logo Design Services',
      category: 'heading',
      headingLevel: 1,
      interactive: false,
      role: 'heading',
      score: 18,
      tag: 'h1',
    }),
    element('search', {
      accessibleName: 'Search services',
      inputType: 'search',
      role: 'textbox',
      score: 20,
      tag: 'input',
    }),
    element('filter', {
      accessibleName: 'Budget filter',
      role: 'button',
      score: 14,
    }),
    element('gig-1', {
      accessibleName: 'Minimal logo by Maya',
      category: 'region',
      interactive: false,
      repetitionKey: 'gig-card',
      role: 'article',
      score: 17,
      tag: 'article',
      text: 'Minimal logo by Maya. 4.9 rating. ₹3,200. Two day delivery.',
    }),
    element('gig-2', {
      accessibleName: 'Brand logo by Arun',
      category: 'region',
      interactive: false,
      repetitionKey: 'gig-card',
      role: 'article',
      score: 16,
      tag: 'article',
      text: 'Brand logo by Arun. 4.8 rating. ₹4,100. Three day delivery.',
    }),
    element('gig-3', {
      accessibleName: 'Modern logo by Nina',
      category: 'region',
      interactive: false,
      repetitionKey: 'gig-card',
      role: 'article',
      score: 15,
      tag: 'article',
      text: 'Modern logo by Nina. 4.7 rating. ₹2,800. Two day delivery.',
    }),
    element('nav-noise', {
      accessibleName: 'Categories',
      category: 'navigation',
      interactive: false,
      role: 'navigation',
      score: 3,
      tag: 'nav',
    }),
  ];

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
      captureDurationMs: 12,
      mutationCount: 0,
      selectedCount: elements.length,
      trigger: 'manual',
    },
    pageId: 'page-listing',
    privacy: {
      hasEditableControl: true,
      hasNonEmptyEditableControl: false,
      hasPasswordControl: false,
    },
    regions: [
      {
        accessibleName: 'Services',
        auraId: 'main-region',
        inViewport: true,
        landmark: 'main',
        rect: { height: 700, width: 1000, x: 0, y: 80 },
        role: 'main',
        tag: 'main',
      },
    ],
    repeatedStructures: [
      {
        category: 'region',
        count: 3,
        exampleNames: ['Minimal logo by Maya', 'Brand logo by Arun'],
        key: 'gig-card',
        representativeAuraIds: ['gig-1', 'gig-2', 'gig-3'],
      },
    ],
    revision: 2,
    schemaVersion: 1,
    title: 'Logo Design Services | Marketplace',
    url: 'https://example.com/logos',
    viewport: { height: 900, scrollX: 0, scrollY: 0, width: 1280 },
    visibleAuraIds: elements.map((item) => item.auraId),
  };
}

const semantic: SemanticPlan = {
  collapseTargetIds: [],
  deemphasizeTargetIds: [],
  guide: {
    steps: [
      { auraId: 'search', instruction: 'Start with the service search' },
      { auraId: 'filter', instruction: 'Set the budget you can spend' },
    ],
    title: 'Find the right logo designer',
  },
  highlightTargetIds: ['search'],
  importantFacts: [
    { auraId: 'gig-1', label: 'Strong match', value: '₹3,200 · 4.9 rating' },
  ],
  pageId: 'page-listing',
  pagePurpose: 'Find a logo designer',
  primaryTargetIds: ['search', 'filter'],
  revision: 2,
  simplifications: [],
  summary: 'Search, set your budget, then compare a small number of relevant services.',
};

describe('AURA Recompose planning', () => {
  it('turns a repeated marketplace into a listing interface', () => {
    const plan = buildPageRecomposePlan({
      page: listingPage(),
      preset: 'clear_calm',
    });

    expect(plan.archetype).toBe('listing');
    expect(plan.source).toBe('deterministic');
    expect(plan.sections.some((section) => section.kind === 'results')).toBe(true);
    const results = plan.sections.find((section) => section.kind === 'results');
    expect(results?.items.map((item) => item.targetAuraId)).toEqual([
      'gig-1',
      'gig-2',
      'gig-3',
    ]);
    expect(results?.items.length).toBeLessThanOrEqual(5);
  });

  it('uses only real current-page targets from a local model plan', () => {
    const page = listingPage();
    const plan = buildPageRecomposePlan({
      currentGoal: 'Find a logo designer under ₹5,000',
      local: {
        archetype: 'listing',
        confidence: 0.9,
        primaryTargetIds: ['search', 'made-up-target'],
        resultTargetIds: ['gig-3', 'gig-1', 'not-real'],
        sectionOrder: ['results', 'actions', 'content'],
        supportingTargetIds: ['heading', 'missing'],
        summary: 'Prioritize affordable logo services and the real search control.',
      },
      page,
      preset: 'step_by_step',
    });

    const targetIds = plan.sections
      .flatMap((section) => section.items)
      .map((item) => item.targetAuraId)
      .filter((id): id is string => id !== null);
    expect(targetIds).not.toContain('made-up-target');
    expect(targetIds).not.toContain('not-real');
    expect(targetIds).not.toContain('missing');
    expect(plan.title).toBe('Find a logo designer under ₹5,000');
    expect(plan.source).toBe('local');
  });

  it('folds a complete cloud semantic plan into the already-usable interface', () => {
    const initial = buildPageRecomposePlan({
      page: listingPage(),
      preset: 'clear_calm',
    });
    const refined = refinePageRecomposeWithSemantic(initial, semantic);

    expect(refined.source).toBe('cloud');
    expect(refined.title).toBe('Find a logo designer');
    expect(refined.sections[0]?.id).toBe('guide');
    expect(refined.sections.some((section) => section.id === 'facts')).toBe(true);
    expect(refined.summary).toContain('compare');
  });

  it('infers the four judge transformations from presentation settings', () => {
    expect(
      inferPresetFromSettings({
        informationDensity: 'step_by_step',
        reduceMotion: true,
        targetSizePx: 52,
        textScale: 1.1,
      }),
    ).toBe('step_by_step');
    expect(
      inferPresetFromSettings({
        informationDensity: 'calm',
        reduceMotion: true,
        targetSizePx: 60,
        textScale: 1.35,
      }),
    ).toBe('easier_to_see');
    expect(
      inferPresetFromSettings({
        informationDensity: 'calm',
        reduceMotion: true,
        targetSizePx: 60,
        textScale: 1.08,
      }),
    ).toBe('easy_to_control');
    expect(
      inferPresetFromSettings({
        informationDensity: 'calm',
        reduceMotion: true,
        targetSizePx: 52,
        textScale: 1.1,
      }),
    ).toBe('clear_calm');
  });
});
