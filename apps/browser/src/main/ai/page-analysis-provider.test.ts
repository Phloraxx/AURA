import { describe, expect, it } from 'vitest';

import type { PageModel } from '../../shared/page-model';
import { createDefaultBrowserProfile } from '../../shared/profile';
import {
  buildPageAnalysisContext,
  compactPageModel,
  createPageAnalysisProvider,
} from './page-analysis-provider';

const page: PageModel = {
  capturedAt: '2026-07-24T00:00:00.000Z',
  elements: [],
  extractionHealth: {
    enoughTargets: false,
    formLabelCoverage: 1,
    hasHeading: false,
    hasInteractive: false,
    hasPrimaryRegion: false,
    score: 0.2,
  },
  forms: [],
  metrics: {
    candidateCount: 0,
    captureDurationMs: 1,
    mutationCount: 0,
    selectedCount: 0,
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
  revision: 1,
  schemaVersion: 1,
  title: 'Fixture',
  url: 'https://example.com/',
  viewport: { height: 900, scrollX: 0, scrollY: 0, width: 1200 },
  visibleAuraIds: [],
};

describe('page analysis provider', () => {
  it('uses a bounded fallback when OpenAI is not configured', async () => {
    const result = await createPageAnalysisProvider({}).analyze({
      currentIntent: null,
      page,
      profile: createDefaultBrowserProfile(),
      screenshotDataUrl: null,
    });

    expect(result.source).toBe('fallback');
    expect(result.output).toBeNull();
    expect(result.error).toContain('not configured');
  });

  it('includes the active browsing goal in the flagship analysis context', () => {
    const context = JSON.stringify(
      buildPageAnalysisContext({
        currentIntent: {
          goal: 'register for semester seven',
          preserveAcrossNavigation: true,
        },
        page,
        profile: createDefaultBrowserProfile(),
        screenshotDataUrl: null,
      }),
    );

    expect(context).toContain('register for semester seven');
    expect(context).toContain('preserveAcrossNavigation');
  });

  it('serializes only modeled page data', () => {
    const compact = JSON.stringify(compactPageModel(page));

    expect(compact).toContain('"pageId":"page-1"');
    expect(compact).not.toContain('passwordValue');
  });
});
