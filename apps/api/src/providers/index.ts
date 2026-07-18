import type { LLMProvider } from './llm-provider.js';
import { MockLLMProvider } from './mock-llm-provider.js';
import { MockSTTProvider } from './mock-stt-provider.js';
import { OpenAILLMProvider } from './openai-llm-provider.js';
import { OpenAISTTProvider } from './openai-stt-provider.js';

export function createLLMProviderFromEnv(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'mock';
  if (provider === 'mock') return new MockLLMProvider();
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai.');
    return new OpenAILLMProvider({
      apiKey,
      ...(process.env.OPENAI_MODEL ? { model: process.env.OPENAI_MODEL } : {}),
    });
  }
  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export function createSTTProviderFromEnv() {
  const provider = process.env.STT_PROVIDER ?? 'mock';
  if (provider === 'mock') return new MockSTTProvider();
  if (provider === 'openai') {
    const apiKey = process.env.STT_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'STT_API_KEY or OPENAI_API_KEY is required when STT_PROVIDER=openai.',
      );
    }
    return new OpenAISTTProvider({
      apiKey,
      ...(process.env.STT_MODEL ? { model: process.env.STT_MODEL } : {}),
    });
  }
  throw new Error(`Unsupported STT_PROVIDER: ${provider}`);
}

export type { LLMProvider } from './llm-provider.js';
export type { STTProvider, TranscriptionInput } from './stt-provider.js';
export { ProviderError } from './llm-provider.js';
