import { describe, expect, it } from 'vitest';

import {
  pageRepresentationSchema,
  semanticPageAnalysisSchema,
} from './semantic.js';

describe('semantic contracts', () => {
  it('accepts only bounded temporary page IDs and no form values', () => {
    expect(() =>
      pageRepresentationSchema.parse({
        title: 'Page',
        elements: [
          {
            id: 'aura:n1',
            kind: 'control',
            tag: 'input',
            critical: false,
            value: 'secret',
          },
        ],
        truncated: false,
      }),
    ).toThrow();
  });

  it('rejects executable fields from model output', () => {
    expect(() =>
      semanticPageAnalysisSchema.parse({
        mainContent: [],
        primaryActions: [],
        navigation: [],
        distractions: [],
        ambiguousControls: [],
        complexTextBlocks: [],
        formGroups: [],
        warnings: [],
        javascript: 'document.body.remove()',
      }),
    ).toThrow();
  });
});
