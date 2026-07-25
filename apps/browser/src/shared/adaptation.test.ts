import { describe, expect, it } from 'vitest';

import {
  isAdaptationCommandCurrent,
  type AdaptationCommand,
} from './adaptation';

describe('adaptation command freshness', () => {
  it('rebases a recompose plan across same-document revisions', () => {
    const command: AdaptationCommand = {
      pageId: 'page-1',
      plan: {
        archetype: 'article',
        pageId: 'page-1',
        preset: 'personalized',
        revision: 2,
        sections: [
          {
            id: 'content',
            items: [],
            kind: 'content',
            title: 'What matters',
          },
        ],
        source: 'local',
        subtitle: null,
        summary: null,
        title: 'Article',
      },
      reduceMotion: false,
      revision: 2,
      type: 'apply-recompose',
      view: 'aura',
    };

    expect(isAdaptationCommandCurrent(command, 'page-1', 7)).toBe(true);
    expect(isAdaptationCommandCurrent(command, 'page-2', 2)).toBe(false);
  });

  it('keeps presentation commands revision-strict', () => {
    const command: AdaptationCommand = {
      pageId: 'page-1',
      revision: 2,
      settings: {
        lineSpacing: 1.5,
        readingWidth: 'narrow',
        reduceMotion: true,
        strongFocus: true,
        targetSizePx: 52,
        textScale: 1.2,
      },
      type: 'apply-presentation',
    };

    expect(isAdaptationCommandCurrent(command, 'page-1', 2)).toBe(true);
    expect(isAdaptationCommandCurrent(command, 'page-1', 3)).toBe(false);
  });
});
