import type { STTProvider } from './stt-provider.js';

export class MockSTTProvider implements STTProvider {
  transcribe(): Promise<{ text: string; confidence: number }> {
    return Promise.resolve({
      text: 'I would like larger text and clearer controls.',
      confidence: 1,
    });
  }
}

