import { createNeutralProfile } from '@aura/shared';
import { describe, expect, it, vi } from 'vitest';

import { createAuraApiClient } from './client';

const input = {
  profile: createNeutralProfile({
    id: 'client-test',
    name: 'Client test',
    now: '2026-07-18T12:00:00.000Z',
  }),
  transcript: [],
  userResponse: 'Yes',
  askedAreas: ['visual'],
};

describe('AURA API client', () => {
  it('uses the fixed endpoint without credentials and validates output', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          assistantMessage: 'What else would help?',
          profilePatch: {},
          confidence: 0.4,
          suggestedCalibrationTask: null,
          onboardingComplete: false,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = createAuraApiClient({
      baseUrl: 'https://api.example.com/',
      fetchImplementation,
    });

    await expect(client.respondToOnboarding(input)).resolves.toMatchObject({
      confidence: 0.4,
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/v1/onboarding/respond',
      expect.objectContaining({ credentials: 'omit', method: 'POST' }),
    );
  });

  it('rejects insecure non-local API origins', () => {
    expect(() => createAuraApiClient({ baseUrl: 'http://api.example.com' })).toThrow(
      'must use HTTPS',
    );
  });

  it('normalizes unreachable backends as retryable errors', async () => {
    const client = createAuraApiClient({
      fetchImplementation: vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
    });

    await expect(client.respondToOnboarding(input)).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('uploads audio directly as multipart data without credentials', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ text: 'Larger controls would help.' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createAuraApiClient({ fetchImplementation });

    await expect(
      client.transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }), 'en'),
    ).resolves.toEqual({ text: 'Larger controls would help.' });
    const options = fetchImplementation.mock.calls[0]?.[1];
    expect(options?.body).toBeInstanceOf(FormData);
    expect(options?.credentials).toBe('omit');
    expect(new Headers(options?.headers).has('content-type')).toBe(false);
  });
});
