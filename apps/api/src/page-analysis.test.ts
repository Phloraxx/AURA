import {
  apiErrorSchema,
  semanticPageAnalysisSchema,
  type PageAnalysisRequest,
} from '@aura/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import type { LLMProvider } from './providers/index.js';

const request: PageAnalysisRequest = {
  page: {
    title: 'Fixture article',
    truncated: false,
    elements: [
      {
        id: 'aura:n1',
        kind: 'landmark',
        tag: 'main',
        text: 'The primary article',
        critical: false,
      },
      {
        id: 'aura:n2',
        kind: 'control',
        tag: 'button',
        accessibleName: 'Continue',
        inputKind: 'button',
        critical: false,
      },
    ],
  },
};

describe('POST /v1/page/analyze', () => {
  it('identifies main content and a likely primary action with the offline provider', async () => {
    const response = await createApp().request('/v1/page/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });

    expect(response.status).toBe(200);
    const analysis = semanticPageAnalysisSchema.parse(await response.json());
    expect(analysis.mainContent[0]?.id).toBe('aura:n1');
    expect(analysis.primaryActions[0]?.id).toBe('aura:n2');
  });

  it('rejects malformed snapshots before calling the provider', async () => {
    const analyzePage = vi.fn<LLMProvider['analyzePage']>();
    const onboarding = vi.fn<LLMProvider['onboarding']>();
    const simplifyText = vi.fn<LLMProvider['simplifyText']>();
    const app = createApp({ llmProvider: { onboarding, analyzePage, simplifyText } });

    const response = await app.request('/v1/page/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: { title: 'Bad', elements: [{ id: 'invented' }] } }),
    });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'invalid_page_snapshot',
    );
    expect(analyzePage).not.toHaveBeenCalled();
  });

  it('rejects page snapshots larger than the bounded JSON limit', async () => {
    const response = await createApp().request('/v1/page/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, padding: 'x'.repeat(70_000) }),
    });

    expect(response.status).toBe(413);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'payload_too_large',
    );
  });
});
