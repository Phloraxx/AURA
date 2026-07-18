import type { LLMProvider } from './llm-provider.js';
import { MockLLMProvider } from './mock-llm-provider.js';
import { OpenAILLMProvider } from './openai-llm-provider.js';

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

export type { LLMProvider } from './llm-provider.js';
export { ProviderError } from './llm-provider.js';
