import type {
  OnboardingRequest,
  OnboardingResponse,
  PageAnalysisRequest,
  SemanticPageAnalysis,
  SimplifyTextRequest,
  SimplifyTextResponse,
} from '@aura/shared';

export interface LLMProvider {
  onboarding(input: OnboardingRequest): Promise<OnboardingResponse>;
  analyzePage(input: PageAnalysisRequest): Promise<SemanticPageAnalysis>;
  simplifyText(input: SimplifyTextRequest): Promise<SimplifyTextResponse>;
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
