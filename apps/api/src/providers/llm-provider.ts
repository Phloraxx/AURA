import type {
  OnboardingRequest,
  OnboardingResponse,
  PageAnalysisRequest,
  SemanticPageAnalysis,
} from '@aura/shared';

export interface LLMProvider {
  onboarding(input: OnboardingRequest): Promise<OnboardingResponse>;
  analyzePage(input: PageAnalysisRequest): Promise<SemanticPageAnalysis>;
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
