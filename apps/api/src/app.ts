import {
  onboardingRequestSchema,
  onboardingResponseSchema,
  type ApiError,
} from '@aura/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import {
  createLLMProviderFromEnv,
  ProviderError,
  type LLMProvider,
} from './providers/index.js';

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export interface CreateAppOptions {
  llmProvider?: LLMProvider;
}

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
    '/v1/*',
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
