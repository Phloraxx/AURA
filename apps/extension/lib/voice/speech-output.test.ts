import { describe, expect, it, vi } from 'vitest';

import { createBrowserSpeechOutput } from './speech-output';

describe('browser speech output', () => {
  it('cancels prior speech and reads bounded visible text', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn() };
    const utterance = { rate: 1 } as SpeechSynthesisUtterance;
    const createUtterance = vi.fn<(text: string) => SpeechSynthesisUtterance>(
      () => utterance,
    );
    const output = createBrowserSpeechOutput(synthesis, createUtterance);

    output.speak('Question '.repeat(200));

    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(createUtterance.mock.calls[0]?.[0].length).toBe(1_000);
    expect(utterance.rate).toBe(0.95);
    expect(synthesis.speak).toHaveBeenCalledWith(utterance);
  });

  it('is a safe no-op when synthesis is unavailable', () => {
    const output = createBrowserSpeechOutput(undefined);
    expect(output.supported).toBe(false);
    expect(() => output.speak('Hello')).not.toThrow();
  });
});
