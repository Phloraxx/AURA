import {
  adaptationPreferencesSchema,
  capabilityDimensionSchema,
  capabilityProfilePatchSchema,
  onboardingResponseSchema,
  type OnboardingRequest,
} from '@aura/shared';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { ONBOARDING_SYSTEM_PROMPT } from '../prompts/onboarding.js';
import type { LLMProvider } from './llm-provider.js';
import { ProviderError } from './llm-provider.js';

export interface OpenAILLMProviderOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

const nullablePreferencesSchema = z.object(
  Object.fromEntries(
    Object.entries(adaptationPreferencesSchema.shape).map(([key, schema]) => [
      key,
      schema.nullable(),
    ]),
  ) as {
    [Key in keyof typeof adaptationPreferencesSchema.shape]: ReturnType<
      (typeof adaptationPreferencesSchema.shape)[Key]['nullable']
    >;
  },
);

export const onboardingStructuredOutputSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(1_000),
  profilePatch: z.object({
    dimensions: z.object({
      visual: capabilityDimensionSchema.nullable(),
      auditory: capabilityDimensionSchema.nullable(),
      motor: capabilityDimensionSchema.nullable(),
      cognitive: capabilityDimensionSchema.nullable(),
      attention: capabilityDimensionSchema.nullable(),
      language: capabilityDimensionSchema.nullable(),
    }),
    modalities: z.object({
      preferredInput: z.array(z.enum(['pointer', 'keyboard', 'voice'])).nullable(),
      preferredOutput: z.array(z.enum(['visual', 'speech'])).nullable(),
      screenReader: z.boolean().nullable(),
    }),
    preferences: nullablePreferencesSchema,
  }),
  confidence: z.number().min(0).max(1),
  suggestedCalibrationTask: z
    .enum(['text_presentation', 'control_size', 'clutter_focus'])
    .nullable(),
  onboardingComplete: z.boolean(),
});

function withoutNulls(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, Exclude<unknown, null>] => {
      return entry[1] !== null;
    }),
  );
}

export function normalizeStructuredOnboardingOutput(
  value: z.infer<typeof onboardingStructuredOutputSchema>,
) {
  const profilePatch = capabilityProfilePatchSchema.parse({
    dimensions: withoutNulls(value.profilePatch.dimensions),
    modalities: withoutNulls(value.profilePatch.modalities),
    preferences: withoutNulls(value.profilePatch.preferences),
  });
  return onboardingResponseSchema.parse({ ...value, profilePatch });
}

export class OpenAILLMProvider implements LLMProvider {
  readonly #client: OpenAI;
  readonly #model: string;

  constructor({
    apiKey,
    model = 'gpt-5.6-luna',
    timeoutMs = 12_000,
  }: OpenAILLMProviderOptions) {
    this.#client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: timeoutMs,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
  }

  async onboarding(input: OnboardingRequest) {
    try {
      const response = await this.#client.responses.parse({
        model: this.#model,
        instructions: ONBOARDING_SYSTEM_PROMPT,
        input: JSON.stringify({
          profile: input.profile,
          transcript: input.transcript.slice(-12),
          userResponse: input.userResponse,
          askedAreas: input.askedAreas,
        }),
        max_output_tokens: 1_200,
        text: {
          format: zodTextFormat(
            onboardingStructuredOutputSchema,
            'aura_onboarding_response',
          ),
        },
      });
      if (!response.output_parsed) {
        throw new ProviderError('The onboarding provider returned no structured output.', false);
      }
      return normalizeStructuredOnboardingOutput(response.output_parsed);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new ProviderError('The onboarding provider timed out.', true);
      }
      if (error instanceof OpenAI.RateLimitError || error instanceof OpenAI.APIConnectionError) {
        throw new ProviderError('The onboarding provider is temporarily unavailable.', true);
      }
      throw new ProviderError('The onboarding provider returned an invalid response.', false);
    }
  }
}
