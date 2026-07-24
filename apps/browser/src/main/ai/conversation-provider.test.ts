import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createDefaultBrowserProfile } from '../../shared/profile';
import type { PageModel } from '../../shared/page-model';
import {
  createConversationProvider,
  deterministicConversationTurn,
  type ConversationProviderRequest,
} from './conversation-provider';

const page = {
  elements: [
    {
      accessibleName: 'Apply now',
      auraId: 'action-1',
      category: 'control',
      formAuraId: null,
      headingLevel: null,
      inViewport: true,
      interactive: true,
      landmark: null,
      rect: { height: 40, width: 120, x: 10, y: 10 },
      role: 'button',
      states: [],
      tag: 'button',
      text: 'Apply now',
      textLength: 9,
    },
  ],
  forms: [],
  pageId: 'page-1',
  privacy: {
    hasNonEmptyEditableControl: false,
    hasPasswordControl: false,
  },
  regions: [],
  repeatedStructures: [],
  revision: 1,
  title: 'Application',
  url: 'https://example.com/apply',
  viewport: { height: 800, width: 1200 },
} as unknown as PageModel;

function request(userMessage: string): ConversationProviderRequest {
  return {
    currentIntent: null,
    page,
    profile: createDefaultBrowserProfile(),
    recentConversation: [],
    semanticPlan: null,
    userMessage,
  };
}

describe('deterministicConversationTurn', () => {
  it('recognizes an adjustment without exact command phrasing', () => {
    const result = deterministicConversationTurn(
      request('These controls still feel a little too small.'),
    );
    expect(result.actionFamily).toBe('adjust');
    expect(result.adjustment?.targetSizePx).toBe(60);
  });

  it('creates goal guidance using original page targets', () => {
    const result = deterministicConversationTurn(
      request('Could you help me apply?'),
    );
    expect(result.actionFamily).toBe('goal_guide');
    expect(result.intent?.goal).toBe('apply?');
    expect(result.adaptationPatch?.guide?.steps[0]?.auraId).toBe('action-1');
  });

  it('continues a preserved goal using matching controls on the new page', () => {
    const continued = request('What now?');
    continued.currentIntent = {
      goal: 'apply',
      preserveAcrossNavigation: true,
    };
    const result = deterministicConversationTurn(continued);

    expect(result.actionFamily).toBe('goal_guide');
    expect(result.intent?.goal).toBe('apply');
    expect(result.adaptationPatch?.guide?.steps[0]?.auraId).toBe('action-1');
  });

  it('does not fabricate a fallback guide when the goal matches no page target', () => {
    const result = deterministicConversationTurn(
      request('Help me find the quantum banana warranty.'),
    );
    expect(result.actionFamily).toBe('goal_guide');
    expect(result.adaptationPatch).toBeNull();
  });

  it('requires explicit remember phrasing before proposing memory', () => {
    const result = deterministicConversationTurn(
      request('Remember that I prefer short explanations.'),
    );
    expect(result.actionFamily).toBe('remember');
    expect(result.memoryProposal?.preference).toBe(
      'I prefer short explanations.',
    );
  });

  it.runIf(process.env.AURA_LIVE_AI === '1')(
    'returns a structured Luna response for a natural goal request',
    async () => {
      const result = await createConversationProvider(process.env).turn(
        request('I need help applying on this page.'),
      );
      expect(result.source).toBe('ai');
      expect(result.actionFamily).toBe('goal_guide');
      expect(result.usage?.totalTokens).toBeGreaterThan(0);
    },
    45_000,
  );

  it('falls back when the configured provider is unavailable', async () => {
    const result = await createConversationProvider({
      OPENAI_API_KEY: 'temporary-test-key',
      OPENAI_BASE_URL: 'http://127.0.0.1:1/v1',
    }).turn(request('Explain this page.'));
    expect(result.source).toBe('fallback');
    expect(result.actionFamily).toBe('explain');
  });

  it('times out safely without losing deterministic guidance', async () => {
    const server = createServer(() => {
      // Intentionally leave the response open until the SDK aborts.
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string') {
      server.close();
      throw new Error('Test server did not bind to a TCP port.');
    }
    try {
      const result = await createConversationProvider({
        AURA_OPENAI_TIMEOUT_MS: '25',
        OPENAI_API_KEY: 'temporary-test-key',
        OPENAI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
      }).turn(request('Make these controls bigger.'));
      expect(result.source).toBe('fallback');
      expect(result.adjustment?.targetSizePx).toBe(60);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});
