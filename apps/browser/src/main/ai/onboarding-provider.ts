import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  onboardingModelOutputSchema,
  onboardingTurnRequestSchema,
  onboardingTurnResponseSchema,
  type OnboardingTurnRequest,
  type OnboardingTurnResponse,
} from '../../shared/profile';
import { ONBOARDING_INSTRUCTIONS } from './prompts/onboarding';

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface OnboardingProvider {
  turn: (request: OnboardingTurnRequest) => Promise<OnboardingTurnResponse>;
}

function normalizePreference(note: string): string | null {
  const normalized = note.trim().replace(/\s+/g, ' ');
  const expressesInterfacePreference =
    /\b(avoid|button|clutter|control|detail|easier|explain|focus|hard|keep|motion|navigation|need|prefer|read|reduce|show|technical|text)\b/i.test(
      normalized,
    );
  if (normalized.length < 5 || !expressesInterfacePreference) return null;
  return normalized.slice(0, 300);
}

export function deterministicOnboardingTurn(
  untrustedRequest: unknown,
): OnboardingTurnResponse {
  const request = onboardingTurnRequestSchema.parse(untrustedRequest);
  const learnedPreference = normalizePreference(request.userResponse);

  return onboardingTurnResponseSchema.parse({
    assistantMessage:
      learnedPreference === null
        ? 'Your comfort choices are enough to create a useful AURA profile.'
        : 'Thanks — I’ll include that preference in the profile you review next.',
    confidence: learnedPreference === null ? 0 : 1,
    learnedPreference,
    source: 'fallback',
    usage: null,
  });
}

class OpenAIOnboardingProvider implements OnboardingProvider {
  readonly #client: OpenAI;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: DEFAULT_TIMEOUT_MS,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
  }

  async turn(request: OnboardingTurnRequest): Promise<OnboardingTurnResponse> {
    const parsedRequest = onboardingTurnRequestSchema.parse(request);
    const response = await this.#client.responses.parse({
      model: this.#model,
      instructions: ONBOARDING_INSTRUCTIONS,
      input: JSON.stringify({
        deterministicChoices: parsedRequest.choices,
        optionalUserNote: parsedRequest.userResponse,
      }),
      max_output_tokens: 700,
      reasoning: { effort: 'high' },
      store: false,
      text: {
        format: zodTextFormat(
          onboardingModelOutputSchema,
          'aura_onboarding_turn',
        ),
      },
    });
    const output = response.output_parsed;
    if (output === null) {
      throw new Error('AURA received no structured onboarding response.');
    }

    return onboardingTurnResponseSchema.parse({
      ...output,
      source: 'ai',
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    });
  }
}

export function createOnboardingProvider(
  environment: NodeJS.ProcessEnv = process.env,
): OnboardingProvider {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      turn: (request) => Promise.resolve(deterministicOnboardingTurn(request)),
    };
  }

  const provider = new OpenAIOnboardingProvider(
    apiKey,
    environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
  );
  return {
    turn: async (request) => {
      try {
        return await provider.turn(request);
      } catch (error) {
        console.warn(
          '[AURA] OpenAI onboarding unavailable; using deterministic fallback.',
          error instanceof Error ? error.message : 'Unknown provider error',
        );
        return deterministicOnboardingTurn(request);
      }
    },
  };
}
