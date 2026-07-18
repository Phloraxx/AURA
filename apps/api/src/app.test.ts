import { describe, expect, it } from 'vitest';

import { app } from './app.js';

describe('GET /health', () => {
  it('reports that the API is ready', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: 'aura-api',
      status: 'ok',
    });
  });
});
