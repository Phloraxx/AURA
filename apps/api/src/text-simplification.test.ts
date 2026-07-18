import { apiErrorSchema, simplifyTextResponseSchema } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('POST /v1/text/simplify', () => {
  it('returns a bounded offline simplification', async () => {
    const response = await createApp().request('/v1/text/simplify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Subsequent to setup, utilize the button to commence the activity.',
        desiredLevel: 'simple',
      }),
    });

    expect(response.status).toBe(200);
    const result = simplifyTextResponseSchema.parse(await response.json());
    expect(result.simplifiedText).toContain('after setup');
    expect(result.simplifiedText).toContain('use the button');
    expect(result.requiresOriginal).toBe(false);
  });

  it('flags potentially high-stakes text and rejects oversized input', async () => {
    const highStakes = await createApp().request('/v1/text/simplify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Read these legal payment terms.' }),
    });
    const oversized = await createApp().request('/v1/text/simplify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(5_000) }),
    });

    expect(simplifyTextResponseSchema.parse(await highStakes.json()).requiresOriginal).toBe(
      true,
    );
    expect(oversized.status).toBe(400);
    expect(apiErrorSchema.parse(await oversized.json()).error.code).toBe('invalid_text');
  });
});
