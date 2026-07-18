import type { OnboardingResponse } from '@aura/shared';

import type { LLMProvider } from './llm-provider.js';

const FOLLOW_UPS = [
  'Would larger text or stronger contrast make pages easier to read?',
  'Are small or tightly packed controls difficult to select comfortably?',
  'Would shorter steps make complex forms easier to follow?',
  'Does competing secondary content make it harder to focus?',
  'Would simpler wording or clearer control labels be useful?',
  'Would you like animation and motion reduced?',
  'Do you use a screen reader when browsing?',
  'Would hearing setup questions read aloud be useful?',
] as const;

export class MockLLMProvider implements LLMProvider {
  onboarding(input: Parameters<LLMProvider['onboarding']>[0]): Promise<OnboardingResponse> {
    const answeredCount = Math.min(input.askedAreas.length, FOLLOW_UPS.length);
    const onboardingComplete = answeredCount >= 5;
    const assistantMessage = onboardingComplete
      ? 'Thanks. Your preferences are ready for optional calibration and review.'
      : (FOLLOW_UPS[answeredCount] ?? FOLLOW_UPS.at(-1));

    if (!assistantMessage) throw new Error('Mock onboarding question is unavailable.');
    return Promise.resolve({
      assistantMessage,
      profilePatch: {},
      confidence: 0,
      suggestedCalibrationTask: onboardingComplete ? 'text_presentation' : null,
      onboardingComplete,
    });
  }
}
