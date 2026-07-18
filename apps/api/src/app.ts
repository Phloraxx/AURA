import {
  onboardingRequestSchema,
  onboardingResponseSchema,
  pageAnalysisRequestSchema,
  semanticPageAnalysisSchema,
  simplifyTextRequestSchema,
  simplifyTextResponseSchema,
  transcriptionResponseSchema,
  type ApiError,
} from '@aura/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import {
  createLLMProviderFromEnv,
  createSTTProviderFromEnv,
  ProviderError,
  type LLMProvider,
  type STTProvider,
} from './providers/index.js';

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export interface CreateAppOptions {
  llmProvider?: LLMProvider;
  sttProvider?: STTProvider;
}

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
]);

function errorEnvelope(
  code: string,
  message: string,
  retryable: boolean,
  requestId: string,
): ApiError {
  return { error: { code, message, retryable, requestId } };
}

function safeRequestId(value: unknown): string {
  return typeof value === 'string' && value ? value : crypto.randomUUID();
}

function allowedOrigins(): string[] {
  return (process.env.AURA_ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp({
  llmProvider = createLLMProviderFromEnv(),
  sttProvider = createSTTProviderFromEnv(),
}: CreateAppOptions = {}) {
  const app = new Hono<AppEnv>();
  const origins = allowedOrigins();

  app.use('*', async (context, next) => {
    const requestId = context.req.header('x-request-id') ?? crypto.randomUUID();
    context.set('requestId', requestId);
    context.header('x-request-id', requestId);
    await next();
  });
  app.use(
    '/v1/*',
    cors({
      allowHeaders: ['Content-Type', 'X-Request-ID'],
      allowMethods: ['POST', 'OPTIONS'],
      credentials: false,
      origin: (origin) => (origins.includes(origin) ? origin : ''),
    }),
  );
  app.use(
    '/v1/onboarding/*',
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (context) =>
        context.json(
          errorEnvelope(
            'payload_too_large',
            'This request is too large for AURA to process.',
            false,
            safeRequestId(context.get('requestId')),
          ),
          413,
        ),
    }),
  );
  app.use(
    '/v1/page/*',
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (context) =>
        context.json(
          errorEnvelope(
            'payload_too_large',
            'This request is too large for AURA to process.',
            false,
            safeRequestId(context.get('requestId')),
          ),
          413,
        ),
    }),
  );
  app.use(
    '/v1/text/*',
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (context) =>
        context.json(
          errorEnvelope(
            'payload_too_large',
            'This request is too large for AURA to process.',
            false,
            safeRequestId(context.get('requestId')),
          ),
          413,
        ),
    }),
  );

  app.get('/health', (context) =>
    context.json({
      service: 'aura-api',
      status: 'ok',
    }),
  );

  app.post('/v1/onboarding/respond', async (context) => {
    const requestId = context.get('requestId');
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json(
        errorEnvelope('invalid_json', 'Send a valid JSON request.', false, requestId),
        400,
      );
    }
    const parsed = onboardingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        errorEnvelope(
          'invalid_request',
          'Check the onboarding response and try again.',
          false,
          requestId,
        ),
        400,
      );
    }

    try {
      const result = onboardingResponseSchema.parse(
        await llmProvider.onboarding(parsed.data),
      );
      return context.json(result);
    } catch (error) {
      const retryable = error instanceof ProviderError ? error.retryable : false;
      return context.json(
        errorEnvelope(
          'provider_unavailable',
          retryable
            ? 'Adaptive onboarding is temporarily unavailable. You can continue with local setup.'
            : 'AURA could not use adaptive onboarding. You can continue with local setup.',
          retryable,
          requestId,
        ),
        502,
      );
    }
  });

  app.post('/v1/page/analyze', async (context) => {
    const requestId = context.get('requestId');
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json(
        errorEnvelope('invalid_json', 'Send a valid JSON request.', false, requestId),
        400,
      );
    }
    const parsed = pageAnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        errorEnvelope(
          'invalid_page_snapshot',
          'AURA could not safely analyze this page snapshot.',
          false,
          requestId,
        ),
        400,
      );
    }
    try {
      const result = semanticPageAnalysisSchema.parse(
        await llmProvider.analyzePage(parsed.data),
      );
      return context.json(result);
    } catch (error) {
      const retryable = error instanceof ProviderError ? error.retryable : false;
      return context.json(
        errorEnvelope(
          'page_analysis_failed',
          'Semantic page analysis is unavailable. Local adaptations remain active.',
          retryable,
          requestId,
        ),
        502,
      );
    }
  });

  app.post('/v1/text/simplify', async (context) => {
    const requestId = context.get('requestId');
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json(
        errorEnvelope('invalid_json', 'Send a valid JSON request.', false, requestId),
        400,
      );
    }
    const parsed = simplifyTextRequestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        errorEnvelope(
          'invalid_text',
          'Choose a shorter text passage and try again.',
          false,
          requestId,
        ),
        400,
      );
    }
    try {
      return context.json(
        simplifyTextResponseSchema.parse(
          await llmProvider.simplifyText(parsed.data),
        ),
      );
    } catch (error) {
      const retryable = error instanceof ProviderError ? error.retryable : false;
      return context.json(
        errorEnvelope(
          'text_simplification_failed',
          'Simpler wording is unavailable. The original text remains unchanged.',
          retryable,
          requestId,
        ),
        502,
      );
    }
  });

  app.use(
    '/v1/speech/*',
    bodyLimit({
      maxSize: 10 * 1024 * 1024,
      onError: (context) =>
        context.json(
          errorEnvelope(
            'audio_too_large',
            'Voice answers must be smaller than 10 MB.',
            false,
            safeRequestId(context.get('requestId')),
          ),
          413,
        ),
    }),
  );

  app.post('/v1/speech/transcribe', async (context) => {
    const requestId = context.get('requestId');
    let form: FormData;
    try {
      form = await context.req.formData();
    } catch {
      return context.json(
        errorEnvelope('invalid_audio', 'Send a valid audio recording.', false, requestId),
        400,
      );
    }
    const audio = form.get('audio');
    if (audio === null || typeof audio === 'string') {
      return context.json(
        errorEnvelope('audio_required', 'Record a voice answer first.', false, requestId),
        400,
      );
    }
    const mimeType = audio.type.split(';', 1)[0]?.toLowerCase() ?? '';
    if (!AUDIO_MIME_TYPES.has(mimeType)) {
      return context.json(
        errorEnvelope(
          'unsupported_audio',
          'This browser audio format is not supported.',
          false,
          requestId,
        ),
        415,
      );
    }
    if (audio.size === 0 || audio.size > 10 * 1024 * 1024) {
      return context.json(
        errorEnvelope(
          'invalid_audio_size',
          'Record a shorter voice answer and try again.',
          false,
          requestId,
        ),
        400,
      );
    }
    const languageValue = form.get('languageHint');
    const languageHint =
      typeof languageValue === 'string' &&
      /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/iu.test(languageValue)
        ? languageValue
        : undefined;

    try {
      const result = transcriptionResponseSchema.parse(
        await sttProvider.transcribe({
          bytes: new Uint8Array(await audio.arrayBuffer()),
          fileName: audio.name || `voice-answer.${mimeType.split('/')[1] ?? 'webm'}`,
          mimeType,
          ...(languageHint ? { languageHint } : {}),
        }),
      );
      return context.json(result);
    } catch (error) {
      const retryable = error instanceof ProviderError ? error.retryable : false;
      return context.json(
        errorEnvelope(
          'transcription_failed',
          'AURA could not transcribe that recording. You can type or try again.',
          retryable,
          requestId,
        ),
        502,
      );
    }
  });

  app.onError((error, context) => {
    if (process.env.NODE_ENV !== 'production') console.error(error);
    return context.json(
      errorEnvelope(
        'internal_error',
        'AURA encountered an unexpected error.',
        true,
        context.get('requestId'),
      ),
      500,
    );
  });

  return app;
}

export const app = createApp();
