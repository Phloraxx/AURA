import {
  semanticPageAnalysisSchema,
  simplifyTextResponseSchema,
} from '@aura/shared';
import { zodTextFormat } from 'openai/helpers/zod';
import { describe, expect, it } from 'vitest';

import {
  normalizeStructuredOnboardingOutput,
  onboardingStructuredOutputSchema,
} from './openai-llm-provider.js';

function nullPreferences() {
  return Object.fromEntries(
    Object.keys(onboardingStructuredOutputSchema.shape.profilePatch.shape.preferences.shape).map(
      (key) => [key, null],
    ),
  );
}

describe('OpenAI onboarding structured output', () => {
  it('generates an API-compatible strict JSON schema', () => {
    expect(() =>
      zodTextFormat(onboardingStructuredOutputSchema, 'aura_onboarding_response'),
    ).not.toThrow();
    expect(() =>
      zodTextFormat(semanticPageAnalysisSchema, 'aura_page_analysis'),
    ).not.toThrow();
    expect(() =>
      zodTextFormat(simplifyTextResponseSchema, 'aura_text_simplification'),
    ).not.toThrow();
  });

  it('normalizes provider nulls into a constrained partial patch', () => {
    const parsed = onboardingStructuredOutputSchema.parse({
      assistantMessage: 'Would larger text be useful?',
      profilePatch: {
        dimensions: {
          visual: null,
          auditory: null,
          motor: null,
          cognitive: null,
          attention: null,
          language: null,
        },
        modalities: {
          preferredInput: null,
          preferredOutput: null,
          screenReader: null,
        },
        preferences: { ...nullPreferences(), textScale: 1.3 },
      },
      confidence: 0.8,
      suggestedCalibrationTask: 'text_presentation',
      onboardingComplete: false,
    });

    expect(normalizeStructuredOnboardingOutput(parsed).profilePatch).toEqual({
      dimensions: {},
      modalities: {},
      preferences: { textScale: 1.3 },
    });
  });
});
