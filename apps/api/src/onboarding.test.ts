import {
  apiErrorSchema,
  createNeutralProfile,
  onboardingResponseSchema,
  type OnboardingRequest,
} from '@aura/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { ProviderError, type LLMProvider } from './providers/index.js';

function requestBody(): OnboardingRequest {
  return {
    profile: createNeutralProfile({
      id: 'onboarding-test',
      name: 'Test profile',
      now: '2026-07-18T12:00:00.000Z',
    }),
    transcript: [
      { role: 'assistant', content: 'Would larger text be useful?' },
      { role: 'user', content: 'Yes, larger text would help.' },
    ],
    userResponse: 'Yes, larger text would help.',
    askedAreas: ['visual'],
  };
}

function providerWith(
  onboarding: LLMProvider['onboarding'],
): LLMProvider {
  return { onboarding };
}

describe('POST /v1/onboarding/respond', () => {
  it('validates the request and provider response', async () => {
    const onboarding = vi.fn<LLMProvider['onboarding']>().mockResolvedValue({
      assistantMessage: 'Are small controls difficult to select?',
      profilePatch: {
        preferences: { textScale: 1.3, contrast: 'enhanced' },
      },
      confidence: 0.8,
      suggestedCalibrationTask: 'text_presentation',
      onboardingComplete: false,
    });
    const app = createApp({ llmProvider: providerWith(onboarding) });

    const response = await app.request('/v1/onboarding/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody()),
    });

    expect(response.status).toBe(200);
    expect(onboarding).toHaveBeenCalledOnce();
    expect(onboardingResponseSchema.parse(await response.json())).toMatchObject({
      confidence: 0.8,
      onboardingComplete: false,
    });
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('rejects malformed requests without calling the provider', async () => {
    const onboarding = vi.fn<LLMProvider['onboarding']>();
    const app = createApp({ llmProvider: providerWith(onboarding) });

    const response = await app.request('/v1/onboarding/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userResponse: '' }),
    });

    expect(response.status).toBe(400);
    expect(onboarding).not.toHaveBeenCalled();
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'invalid_request',
    );
  });

  it('normalizes provider failure without exposing its body', async () => {
    const secretProviderMessage = 'upstream body containing secret details';
    const app = createApp({
      llmProvider: providerWith(() =>
        Promise.reject(new ProviderError(secretProviderMessage, true)),
      ),
    });

    const response = await app.request('/v1/onboarding/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody()),
    });
    const raw = await response.text();

    expect(response.status).toBe(502);
    expect(raw).not.toContain(secretProviderMessage);
    const error = apiErrorSchema.parse(JSON.parse(raw)).error;
    expect(error).toMatchObject({ code: 'provider_unavailable', retryable: true });
  });

  it('rejects oversized onboarding payloads', async () => {
    const app = createApp({
      llmProvider: providerWith(() => Promise.reject(new Error('not called'))),
    });
    const response = await app.request('/v1/onboarding/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...requestBody(), padding: 'x'.repeat(70_000) }),
    });

    expect(response.status).toBe(413);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'payload_too_large',
    );
  });
});
