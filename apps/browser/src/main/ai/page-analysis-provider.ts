import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import type { PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import type { SessionIntent } from '../../shared/conversation';
import {
  pageAnalysisModelOutputSchema,
  pageAnalysisProviderResultSchema,
  type PageAnalysisProviderResult,
} from '../../shared/semantic-analysis';
import { PAGE_ANALYSIS_INSTRUCTIONS } from './prompts/page-analysis';

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 35_000;
const REASONING_EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'medium';

function resolveReasoningEffort(environment: NodeJS.ProcessEnv): ReasoningEffort {
  const candidate = (
    environment.AURA_PAGE_REASONING_EFFORT ?? environment.AURA_REASONING_EFFORT
  )?.trim();
  return REASONING_EFFORTS.includes(candidate as ReasoningEffort)
    ? (candidate as ReasoningEffort)
    : DEFAULT_REASONING_EFFORT;
}

export interface PageAnalysisRequest {
  currentIntent: SessionIntent | null;
  page: PageModel;
  profile: BrowserProfile;
  screenshotDataUrl: string | null;
}

export interface PageAnalysisProvider {
  analyze: (request: PageAnalysisRequest) => Promise<PageAnalysisProviderResult>;
}

export function compactPageModel(page: PageModel): object {
  return {
    elements: page.elements.map((element) => ({
      auraId: element.auraId,
      category: element.category,
      formAuraId: element.formAuraId,
      headingLevel: element.headingLevel,
      inViewport: element.inViewport,
      interactive: element.interactive,
      landmark: element.landmark,
      name: element.accessibleName,
      rect: element.rect,
      role: element.role,
      states: element.states,
      tag: element.tag,
      text: element.text,
      textLength: element.textLength,
    })),
    forms: page.forms,
    pageId: page.pageId,
    privacy: page.privacy,
    regions: page.regions,
    repeatedStructures: page.repeatedStructures,
    revision: page.revision,
    title: page.title,
    url: page.url,
    viewport: page.viewport,
  };
}

export function buildPageAnalysisContext(request: PageAnalysisRequest): object {
  return {
    currentIntent: request.currentIntent,
    page: compactPageModel(request.page),
    profile: {
      capabilities: request.profile.capabilities,
      learnedPreferences: request.profile.learnedPreferences,
      preferences: request.profile.preferences,
      summary: request.profile.summary,
    },
  };
}

function fallbackResult(error: string): PageAnalysisProviderResult {
  return pageAnalysisProviderResultSchema.parse({
    error,
    output: null,
    source: 'fallback',
    usage: null,
  });
}

class OpenAIPageAnalysisProvider implements PageAnalysisProvider {
  readonly #client: OpenAI;
  readonly #model: string;
  readonly #reasoningEffort: ReasoningEffort;

  constructor(apiKey: string, model: string, reasoningEffort: ReasoningEffort) {
    this.#client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: DEFAULT_TIMEOUT_MS,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
    this.#reasoningEffort = reasoningEffort;
  }

  async analyze(
    request: PageAnalysisRequest,
  ): Promise<PageAnalysisProviderResult> {
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        text: JSON.stringify(buildPageAnalysisContext(request)),
        type: 'input_text',
      },
    ];
    if (request.screenshotDataUrl !== null) {
      content.push({
        detail: 'low',
        image_url: request.screenshotDataUrl,
        type: 'input_image',
      });
    }

    const response = await this.#client.responses.parse({
      input: [{ content, role: 'user' }],
      instructions: PAGE_ANALYSIS_INSTRUCTIONS,
      max_output_tokens: 3_000,
      model: this.#model,
      reasoning: { effort: this.#reasoningEffort },
      store: false,
      text: {
        format: zodTextFormat(
          pageAnalysisModelOutputSchema,
          'aura_page_analysis',
        ),
        verbosity: 'low',
      },
    });
    if (response.output_parsed === null) {
      throw new Error('AURA received no structured page analysis.');
    }
    return pageAnalysisProviderResultSchema.parse({
      error: null,
      output: response.output_parsed,
      source: 'ai',
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    });
  }
}

export function createPageAnalysisProvider(
  environment: NodeJS.ProcessEnv = process.env,
): PageAnalysisProvider {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      analyze: () =>
        Promise.resolve(
          fallbackResult('OpenAI is not configured; local presentation remains active.'),
        ),
    };
  }
  const provider = new OpenAIPageAnalysisProvider(
    apiKey,
    environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
    resolveReasoningEffort(environment),
  );
  return {
    analyze: async (request) => {
      try {
        return await provider.analyze(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider error';
        console.warn(
          '[AURA] Semantic page analysis unavailable; keeping local presentation.',
          message,
        );
        return fallbackResult(message);
      }
    },
  };
}
