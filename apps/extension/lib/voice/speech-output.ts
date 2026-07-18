export interface SpeechOutput {
  speak(text: string): void;
  stop(): void;
  supported: boolean;
}

export interface SpeechSynthesisAdapter {
  cancel(): void;
  speak(utterance: SpeechSynthesisUtterance): void;
}

export function createBrowserSpeechOutput(
  synthesis: SpeechSynthesisAdapter | undefined = globalThis.speechSynthesis,
  createUtterance: (text: string) => SpeechSynthesisUtterance = (text) =>
    new SpeechSynthesisUtterance(text),
): SpeechOutput {
  return {
    supported: synthesis !== undefined && 'SpeechSynthesisUtterance' in globalThis,
    speak(text) {
      if (!synthesis || !text.trim()) return;
      synthesis.cancel();
      const utterance = createUtterance(text.slice(0, 1_000));
      utterance.rate = 0.95;
      synthesis.speak(utterance);
    },
    stop() {
      synthesis?.cancel();
    },
  };
}

