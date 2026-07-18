import OpenAI, { toFile } from 'openai';

import { ProviderError } from './llm-provider.js';
import type { STTProvider, TranscriptionInput } from './stt-provider.js';

export interface OpenAISTTProviderOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

export class OpenAISTTProvider implements STTProvider {
  readonly #client: OpenAI;
  readonly #model: string;

  constructor({
    apiKey,
    model = 'gpt-4o-mini-transcribe',
    timeoutMs = 20_000,
  }: OpenAISTTProviderOptions) {
    this.#client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: timeoutMs,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
  }

  async transcribe(input: TranscriptionInput) {
    try {
      const file = await toFile(input.bytes, input.fileName, {
        type: input.mimeType,
      });
      const response = await this.#client.audio.transcriptions.create({
        file,
        model: this.#model,
        ...(input.languageHint ? { language: input.languageHint } : {}),
      });
      return { text: response.text };
    } catch (error) {
      if (
        error instanceof OpenAI.APIConnectionTimeoutError ||
        error instanceof OpenAI.RateLimitError ||
        error instanceof OpenAI.APIConnectionError
      ) {
        throw new ProviderError('The transcription provider is temporarily unavailable.', true);
      }
      throw new ProviderError('The transcription provider could not process the audio.', false);
    }
  }
}

