import type { OnboardingRequest, OnboardingResponse } from '@aura/shared';

export interface LLMProvider {
  onboarding(input: OnboardingRequest): Promise<OnboardingResponse>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
