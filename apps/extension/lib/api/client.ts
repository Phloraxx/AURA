import {
  apiErrorSchema,
  onboardingRequestSchema,
  onboardingResponseSchema,
  transcriptionResponseSchema,
  type OnboardingRequest,
  type OnboardingResponse,
  type TranscriptionResponse,
} from '@aura/shared';

const DEFAULT_API_BASE_URL = 'http://localhost:8787';

function configuredApiBaseUrl(): string {
  const value: unknown = import.meta.env.WXT_PUBLIC_AURA_API_BASE_URL;
  return typeof value === 'string' && value ? value : DEFAULT_API_BASE_URL;
}

export class AuraApiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AuraApiError';
  }
}

function validateBaseUrl(value: string): string {
  const url = new URL(value);
  const localDevelopment =
    url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('AURA API must use HTTPS outside local development.');
  }
  url.pathname = url.pathname.replace(/\/$/u, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/u, '');
}

export interface AuraApiClientOptions {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export function createAuraApiClient({
  baseUrl = configuredApiBaseUrl(),
  fetchImplementation = fetch,
  timeoutMs = 12_000,
}: AuraApiClientOptions = {}) {
  const fixedBaseUrl = validateBaseUrl(baseUrl);

  async function postJson(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(`${fixedBaseUrl}${path}`, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(payload);
        throw new AuraApiError(
          parsed.success ? parsed.data.error.message : 'AURA API request failed.',
          parsed.success && parsed.data.error.retryable,
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof AuraApiError) throw error;
      throw new AuraApiError('Adaptive setup is currently unavailable.', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function postForm(path: string, body: FormData): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(`${fixedBaseUrl}${path}`, {
        method: 'POST',
        credentials: 'omit',
        body,
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(payload);
        throw new AuraApiError(
          parsed.success ? parsed.data.error.message : 'AURA API request failed.',
          parsed.success && parsed.data.error.retryable,
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof AuraApiError) throw error;
      throw new AuraApiError('Voice transcription is currently unavailable.', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async respondToOnboarding(input: OnboardingRequest): Promise<OnboardingResponse> {
      const request = onboardingRequestSchema.parse(input);
      return onboardingResponseSchema.parse(
        await postJson('/v1/onboarding/respond', request),
      );
    },
    async transcribeAudio(
      audio: Blob,
      languageHint?: string,
    ): Promise<TranscriptionResponse> {
      if (audio.size === 0 || audio.size > 10 * 1024 * 1024) {
        throw new AuraApiError('Record a shorter voice answer and try again.', false);
      }
      const form = new FormData();
      const extensionByType: Record<string, string> = {
        'audio/mp4': 'mp4',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'audio/webm': 'webm',
      };
      const baseMimeType = audio.type.split(';', 1)[0]?.toLowerCase() ?? '';
      form.append(
        'audio',
        audio,
        `voice-answer.${extensionByType[baseMimeType] ?? 'webm'}`,
      );
      if (languageHint) form.append('languageHint', languageHint);
      return transcriptionResponseSchema.parse(
        await postForm('/v1/speech/transcribe', form),
      );
    },
  };
}
