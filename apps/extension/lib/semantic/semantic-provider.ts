import {
  pageRepresentationSchema,
  semanticPageAnalysisSchema,
  simplifyTextRequestSchema,
  simplifyTextResponseSchema,
  type PageRepresentation,
  type SemanticPageAnalysis,
  type SimplifyTextRequest,
  type SimplifyTextResponse,
} from '@aura/shared';

export type SemanticProviderKind = 'on_device' | 'remote' | 'unavailable';

export interface RemoteSemanticProvider {
  analyzePage(page: PageRepresentation): Promise<SemanticPageAnalysis>;
  simplifyText(input: SimplifyTextRequest): Promise<SimplifyTextResponse>;
}

export interface SemanticProvider {
  analyzePage(page: PageRepresentation): Promise<SemanticPageAnalysis>;
  simplifyText(input: SimplifyTextRequest): Promise<SimplifyTextResponse>;
  kind(): SemanticProviderKind;
}

interface PromptSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelApi {
  availability: () => Promise<string>;
  create: (options?: { systemPrompt?: string }) => Promise<PromptSession>;
}

function languageModelApi(): LanguageModelApi | undefined {
  const candidate = (globalThis as { LanguageModel?: unknown }).LanguageModel;
  if (!candidate || typeof candidate !== 'object') return undefined;
  const api = candidate as Partial<LanguageModelApi>;
  return typeof api.availability === 'function' && typeof api.create === 'function'
    ? (api as LanguageModelApi)
    : undefined;
}

function jsonFromPrompt(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu)?.[1];
  return JSON.parse((fenced ?? trimmed).trim()) as unknown;
}

function compactPage(page: PageRepresentation): string {
  return JSON.stringify({
    title: page.title,
    ...(page.language ? { language: page.language } : {}),
    truncated: page.truncated,
    elements: page.elements.map(({ id, kind, tag, role, text, accessibleName, inputKind, headingLevel, critical }) => ({
      id,
      kind,
      tag,
      ...(role ? { role } : {}),
      ...(text ? { text } : {}),
      ...(accessibleName ? { accessibleName } : {}),
      ...(inputKind ? { inputKind } : {}),
      ...(headingLevel ? { headingLevel } : {}),
      critical,
    })),
  });
}

const ANALYSIS_SYSTEM_PROMPT = [
  'You are AURA local page analysis. Return only one JSON object matching the provided semantic page analysis contract.',
  'Use only the supplied element IDs. Never invent IDs. Do not include page text outside target reasons.',
  'Do not diagnose a person, certify compliance, execute actions, or recommend hiding critical controls.',
  'Keep every array small and confidence between 0 and 1.',
].join(' ');

const SIMPLIFY_SYSTEM_PROMPT = [
  'You provide a conservative accessibility wording alternative. Return only one JSON object with simplifiedText, requiresOriginal, and warnings.',
  'Preserve meaning, numbers, conditions, warnings, legal force, and required actions. Never remove a high-stakes caveat.',
  'The original wording must remain available whenever the text may be legal, medical, financial, payment, security, consent, or warning content.',
].join(' ');

class LocalBuiltInAIProvider {
  readonly #api: LanguageModelApi;
  #availability: Promise<boolean> | undefined;

  constructor(api: LanguageModelApi) {
    this.#api = api;
  }

  async isAvailable(): Promise<boolean> {
    this.#availability ??= this.#api
      .availability()
      .then((value) => value === 'available')
      .catch(() => false);
    return this.#availability;
  }

  async analyzePage(page: PageRepresentation): Promise<SemanticPageAnalysis> {
    const validatedPage = pageRepresentationSchema.parse(page);
    return semanticPageAnalysisSchema.parse(
      await this.#prompt(
        ANALYSIS_SYSTEM_PROMPT,
        `Analyze this minimized page representation:\n${compactPage(validatedPage)}`,
      ),
    );
  }

  async simplifyText(input: SimplifyTextRequest): Promise<SimplifyTextResponse> {
    const request = simplifyTextRequestSchema.parse(input);
    return simplifyTextResponseSchema.parse(
      await this.#prompt(
        SIMPLIFY_SYSTEM_PROMPT,
        JSON.stringify({
          text: request.text,
          ...(request.language ? { language: request.language } : {}),
          desiredLevel: request.desiredLevel,
        }),
      ),
    );
  }

  async #prompt(systemPrompt: string, input: string): Promise<unknown> {
    const session = await this.#api.create({ systemPrompt });
    try {
      return jsonFromPrompt(await session.prompt(input));
    } finally {
      session.destroy?.();
    }
  }
}

export function createSemanticProvider(remote: RemoteSemanticProvider): SemanticProvider {
  const localApi = languageModelApi();
  const local = localApi ? new LocalBuiltInAIProvider(localApi) : undefined;
  let currentKind: SemanticProviderKind = 'unavailable';

  return {
    async analyzePage(page) {
      if (local && await local.isAvailable()) {
        try {
          const result = await local.analyzePage(page);
          currentKind = 'on_device';
          return result;
        } catch (error) {
          console.debug('[AURA semantic] On-device analysis failed; trying remote fallback.', error);
        }
      }
      try {
        const result = await remote.analyzePage(page);
        currentKind = 'remote';
        return result;
      } catch (error) {
        currentKind = 'unavailable';
        throw error;
      }
    },
    async simplifyText(input) {
      if (local && await local.isAvailable()) {
        try {
          const result = await local.simplifyText(input);
          currentKind = 'on_device';
          return result;
        } catch (error) {
          console.debug('[AURA semantic] On-device wording failed; trying remote fallback.', error);
        }
      }
      try {
        const result = await remote.simplifyText(input);
        currentKind = 'remote';
        return result;
      } catch (error) {
        currentKind = 'unavailable';
        throw error;
      }
    },
    kind() {
      return currentKind;
    },
  };
}
