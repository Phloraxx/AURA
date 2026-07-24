import { describe, expect, it } from 'vitest';

import {
  createOnboardingProvider,
  deterministicOnboardingTurn,
} from './onboarding-provider';

describe('onboarding provider', () => {
  const request = {
    choices: [
      { area: 'reading' as const, choice: 'comfortable' as const },
    ],
    userResponse: 'Please keep technical words but explain them briefly.',
  };

  it('creates a deterministic result when OpenAI is unavailable', async () => {
    const provider = createOnboardingProvider({});
    const result = await provider.turn(request);

    expect(result.source).toBe('fallback');
    expect(result.learnedPreference).toBe(request.userResponse);
    expect(result.usage).toBeNull();
  });

  it('does not invent a preference from an empty note', () => {
    const result = deterministicOnboardingTurn({
      choices: [],
      userResponse: '',
    });

    expect(result.learnedPreference).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('does not persist a diagnosis statement as an interface preference', () => {
    const result = deterministicOnboardingTurn({
      choices: [],
      userResponse: 'I have ADHD.',
    });

    expect(result.learnedPreference).toBeNull();
  });

  it.runIf(process.env.AURA_LIVE_AI === '1')(
    'returns a structured Luna response in the bounded live smoke test',
    async () => {
      const provider = createOnboardingProvider(process.env);
      const result = await provider.turn(request);

      expect(result.source).toBe('ai');
      expect(result.assistantMessage.length).toBeGreaterThan(0);
      expect(result.usage?.totalTokens).toBeGreaterThan(0);
    },
    30_000,
  );
});
