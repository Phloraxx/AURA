import { createNeutralProfile } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { MockLLMProvider } from './mock-llm-provider.js';

describe('MockLLMProvider', () => {
  it('finishes a deterministic offline interview after five answered areas', async () => {
    const provider = new MockLLMProvider();
    const profile = createNeutralProfile({
      id: 'mock-provider',
      name: 'Mock provider',
      now: '2026-07-18T12:00:00.000Z',
    });

    const early = await provider.onboarding({
      profile,
      transcript: [],
      userResponse: 'Yes',
      askedAreas: ['visual', 'motor', 'cognitive', 'attention'],
    });
    const complete = await provider.onboarding({
      profile,
      transcript: [],
      userResponse: 'Yes',
      askedAreas: ['visual', 'motor', 'cognitive', 'attention', 'language'],
    });

    expect(early.onboardingComplete).toBe(false);
    expect(complete.onboardingComplete).toBe(true);
    expect(complete.assistantMessage.toLowerCase()).not.toMatch(/diagnos/u);
  });
});
