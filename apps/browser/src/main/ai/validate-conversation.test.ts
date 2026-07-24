import { describe, expect, it } from 'vitest';

import type { ConversationTurnResponse } from '../../shared/conversation';
import type { PageModel } from '../../shared/page-model';
import { validateConversationTurn } from './validate-conversation';

const page = {
  elements: [
    {
      auraId: 'real-action',
      category: 'control',
      interactive: true,
    },
    {
      auraId: 'real-region',
      category: 'region',
      interactive: false,
    },
  ],
} as unknown as PageModel;

const response: ConversationTurnResponse = {
  actionFamily: 'goal_guide',
  adaptationPatch: {
    deemphasizeTargetIds: ['real-region', 'fake'],
    guide: {
      steps: [
        { auraId: 'real-action', instruction: 'Use the real action' },
        { auraId: 'fake', instruction: 'Never use this' },
      ],
      title: 'Guide',
    },
    highlightTargetIds: ['real-action', 'fake'],
    primaryTargetIds: ['real-action', 'fake'],
  },
  adjustment: null,
  assistantMessage: 'Use the highlighted control.',
  explanation: null,
  intent: { goal: 'Apply', preserveAcrossNavigation: true },
  memoryProposal: null,
  source: 'ai',
  usage: null,
};

describe('validateConversationTurn', () => {
  it('removes stale and invented targets', () => {
    const validated = validateConversationTurn(response, page);
    expect(validated.adaptationPatch?.primaryTargetIds).toEqual([
      'real-action',
    ]);
    expect(validated.adaptationPatch?.deemphasizeTargetIds).toEqual([
      'real-region',
    ]);
    expect(validated.adaptationPatch?.guide?.steps).toHaveLength(1);
  });
});
