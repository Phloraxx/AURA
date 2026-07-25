import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  conversationModelOutputSchema,
  conversationTurnResponseSchema,
  type ConversationMessage,
  type ConversationModelOutput,
  type ConversationTurnResponse,
  type SessionIntent,
} from '../../shared/conversation';
import type { PageElement, PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import type { SemanticPlan } from '../../shared/semantic-analysis';
import { compactPageModel } from './page-analysis-provider';
import {
  resolveLocalModelConfig,
  resolveLocalTimeout,
} from './local-model-config';
import { CONVERSATION_INSTRUCTIONS } from './prompts/conversation';

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_LOCAL_TIMEOUT_MS = 20_000;

interface OllamaConversationResponse {
  eval_count?: number;
  message?: { content?: string };
  prompt_eval_count?: number;
}

export interface ConversationProviderRequest {
  currentIntent: SessionIntent | null;
  page: PageModel;
  profile: BrowserProfile;
  recentConversation: ConversationMessage[];
  semanticPlan: SemanticPlan | null;
  userMessage: string;
}

export interface ConversationProvider {
  turn: (
    request: ConversationProviderRequest,
  ) => Promise<ConversationTurnResponse>;
}

type ConversationProviderKind = 'cloud' | 'local';

export function resolveConversationProviderOrder(
  environment: NodeJS.ProcessEnv,
  available: {
    cloud: boolean;
    local: boolean;
  },
): ConversationProviderKind[] {
  const preferred =
    environment.AURA_CONVERSATION_PROVIDER?.trim().toLocaleLowerCase() ===
    'local'
      ? ('local' as const)
      : ('cloud' as const);
  const alternate: ConversationProviderKind =
    preferred === 'cloud' ? 'local' : 'cloud';
  const ordered: ConversationProviderKind[] = [preferred, alternate];
  return ordered.filter((kind) => available[kind]);
}

function emptyAdjustment() {
  return {
    explanationStyle: null,
    informationDensity: null,
    preserveTechnicalTerms: null,
    reduceMotion: null,
    targetSizePx: null,
    textScale: null,
  } as const;
}

function compactSemanticPlan(plan: SemanticPlan | null): object | null {
  if (plan === null) return null;
  return {
    guide: plan.guide,
    importantFacts: plan.importantFacts,
    pagePurpose: plan.pagePurpose,
    primaryTargetIds: plan.primaryTargetIds,
    summary: plan.summary,
  };
}

function selectConversationTargets(
  page: PageModel,
  semanticPlan: SemanticPlan | null,
): PageElement[] {
  const available = [...page.elements]
    .filter((element) => element.visible)
    .sort((left, right) => right.score - left.score);
  const selected = new Map<string, PageElement>();
  const add = (elements: PageElement[], limit: number): void => {
    for (const element of elements) {
      if (selected.size >= 52 || limit <= 0) return;
      if (selected.has(element.auraId)) continue;
      selected.set(element.auraId, element);
      limit -= 1;
    }
  };
  const ids = new Set([
    ...(semanticPlan?.primaryTargetIds ?? []),
    ...(semanticPlan?.guide?.steps.map((step) => step.auraId) ?? []),
    ...page.forms.flatMap((form) => form.controlAuraIds),
  ]);

  add(available.filter((element) => ids.has(element.auraId)), 16);
  add(available.filter((element) => element.interactive), 18);
  add(available.filter((element) => element.category === 'heading'), 8);
  add(
    available.filter(
      (element) =>
        element.category === 'region' ||
        element.category === 'text' ||
        element.category === 'list',
    ),
    12,
  );
  add(available, 52 - selected.size);
  return [...selected.values()];
}

function compactLocalConversationContext(
  request: ConversationProviderRequest,
): object {
  return {
    currentIntent: request.currentIntent,
    page: {
      elements: selectConversationTargets(
        request.page,
        request.semanticPlan,
      ).map((element) => ({
        auraId: element.auraId,
        category: element.category,
        formAuraId: element.formAuraId,
        inViewport: element.inViewport,
        interactive: element.interactive,
        name: element.accessibleName,
        role: element.role,
        text: element.text?.replace(/\s+/g, ' ').trim().slice(0, 220) ?? null,
      })),
      forms: request.page.forms.slice(0, 6),
      pageId: request.page.pageId,
      repeatedStructures: request.page.repeatedStructures.slice(0, 6),
      revision: request.page.revision,
      title: request.page.title,
      url: request.page.url,
    },
    profile: {
      learnedPreferences: request.profile.learnedPreferences,
      preferences: request.profile.preferences,
      summary: request.profile.summary,
    },
    recentConversation: request.recentConversation.slice(-8),
    semanticState: compactSemanticPlan(request.semanticPlan),
    userMessage: request.userMessage,
  };
}

function localOutputExample(): ConversationModelOutput {
  return {
    actionFamily: 'answer',
    adaptationPatch: null,
    adjustment: null,
    assistantMessage: 'A concise response grounded in the current page.',
    explanation: null,
    intent: null,
    memoryProposal: null,
  };
}

function findGoalGuide(page: PageModel, goal: string) {
  const terms = goal
    .toLocaleLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2);
  const candidates = page.elements
    .filter(
      (element) =>
        element.interactive ||
        element.category === 'heading' ||
        element.category === 'form',
    )
    .map((element) => {
      const haystack =
        `${element.accessibleName} ${element.text}`.toLocaleLowerCase();
      return {
        element,
        score: terms.filter((term) => haystack.includes(term)).length,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.element.interactive) - Number(left.element.interactive),
    )
    .filter((candidate) => candidate.score > 0)
    .slice(0, 3)
    .map(({ element }) => ({
      auraId: element.auraId,
      instruction: (
        element.accessibleName ||
        element.text ||
        'Continue here'
      ).slice(0, 180),
    }));
  return candidates.length === 0
    ? null
    : {
        steps: candidates,
        title: `Help with ${goal}`,
      };
}

function extractRememberedPreference(message: string): string | null {
  const normalized = message
    .replace(/^\s*(please\s+)?remember(\s+that)?\s*/i, '')
    .trim()
    .replace(/\s+/g, ' ');
  return normalized.length >= 5 ? normalized.slice(0, 300) : null;
}

function isSearchSurfaceRequest(message: string): boolean {
  return (
    /\b(?:show|open|focus on|take me to|help me (?:use|with))\b.{0,60}\bsearch(?: box| field)?\b/.test(
      message,
    ) ||
    /\bsearch(?: box| field)\b.{0,40}\b(?:show|open|focus)\b/.test(message)
  );
}

function isFocusOnlyRequest(message: string): boolean {
  return (
    /\b(?:only|just)\s+(?:show|keep)\b.{0,60}\b(?:important|matters|need)\b/.test(
      message,
    ) ||
    /\b(?:show|keep)\b.{0,40}\b(?:only|just)\b.{0,40}\b(?:important|matters|need)\b/.test(
      message,
    ) ||
    /\b(?:easier to focus|focus on what matters)\b/.test(message)
  );
}

export function deterministicConversationTurn(
  request: ConversationProviderRequest,
): ConversationTurnResponse {
  const message = request.userMessage.trim();
  const lower = message.toLocaleLowerCase();
  const base = {
    adaptationPatch: null,
    adjustment: null,
    explanation: null,
    intent: null,
    memoryProposal: null,
    source: 'fallback' as const,
    usage: null,
  };

  if (/\bremember\b/.test(lower)) {
    const explicitPreference = extractRememberedPreference(message);
    const previousUserMessage = [...request.recentConversation]
      .reverse()
      .find(
        (item) =>
          item.role === 'user' &&
          item.content.trim().toLocaleLowerCase() !== lower,
      )?.content;
    const preference =
      explicitPreference ??
      (/\bremember (this|that)\b/.test(lower) &&
      previousUserMessage !== undefined
        ? previousUserMessage.trim().replace(/\s+/g, ' ').slice(0, 300)
        : null);
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'remember',
      assistantMessage:
        preference === null
          ? 'Tell me the interface preference you want me to remember.'
          : 'I can remember that as a global preference after you confirm.',
      memoryProposal:
        preference === null
          ? null
          : {
              preference,
              reason: 'You explicitly asked AURA to remember this preference.',
            },
    });
  }

  if (
    request.currentIntent !== null &&
    /\b(continue|keep going|next step|what now|where next)\b/.test(lower)
  ) {
    const guide = findGoalGuide(request.page, request.currentIntent.goal);
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'goal_guide',
      adaptationPatch:
        guide === null
          ? null
          : {
              deemphasizeTargetIds: [],
              guide,
              highlightTargetIds: guide.steps.slice(0, 1).map((step) => step.auraId),
              primaryTargetIds: guide.steps.map((step) => step.auraId),
            },
      assistantMessage:
        guide === null
          ? `I’m keeping “${request.currentIntent.goal}” as your goal on this page.`
          : `Continuing “${request.currentIntent.goal}”. Start with the highlighted original control.`,
      intent: request.currentIntent,
    });
  }

  if (isSearchSurfaceRequest(lower)) {
    const goal = 'search this page';
    const guide = findGoalGuide(request.page, 'search');
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'goal_guide',
      adaptationPatch:
        guide === null
          ? null
          : {
              deemphasizeTargetIds: [],
              guide: {
                ...guide,
                title: 'Search this page',
              },
              highlightTargetIds: guide.steps
                .slice(0, 1)
                .map((step) => step.auraId),
              primaryTargetIds: guide.steps.map((step) => step.auraId),
            },
      assistantMessage:
        guide === null
          ? 'I could not find a usable search control on this page.'
          : 'I brought the page’s real search controls forward. Start with the highlighted field.',
      intent: {
        goal,
        preserveAcrossNavigation: false,
      },
    });
  }

  if (/\b(help|trying|want to|need to|find|apply|register|checkout|complete)\b/.test(lower)) {
    const goal = message
      .replace(
        /^\s*(?:(?:could|can|would)\s+you\s+)?(?:please\s+)?(?:help me|i(?:'m| am)? (?:trying|want|need) to)\s*/i,
        '',
      )
      .trim();
    const normalizedGoal = (goal || message).slice(0, 240);
    const guide = request.semanticPlan?.guide ?? findGoalGuide(request.page, normalizedGoal);
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'goal_guide',
      adaptationPatch:
        guide === null
          ? null
          : {
              deemphasizeTargetIds: [],
              guide,
              highlightTargetIds: guide.steps.slice(0, 1).map((step) => step.auraId),
              primaryTargetIds: guide.steps.map((step) => step.auraId),
            },
      assistantMessage:
        guide === null
          ? `I’ll keep “${normalizedGoal}” as your goal while you browse.`
          : `I found a path for “${normalizedGoal}”. Use the highlighted original controls.`,
      intent: {
        goal: normalizedGoal,
        preserveAcrossNavigation: true,
      },
    });
  }

  if (/\b(explain|mean|understand|what is|what does)\b/.test(lower)) {
    const text =
      request.semanticPlan?.summary ??
      `This page is titled “${request.page.title}”. Its main content and controls remain available on the page.`;
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'explain',
      assistantMessage: text,
      explanation: {
        targetAuraId: request.semanticPlan?.primaryTargetIds[0] ?? null,
        text,
      },
    });
  }

  if (
    /\b(easier|bigger|larger|small|calm|distract\w*|motion|detail|technical|simpl\w*|focus)\b/.test(
      lower,
    ) ||
    isFocusOnlyRequest(lower)
  ) {
    const adjustment = emptyAdjustment();
    const next = {
      ...adjustment,
      explanationStyle: /\bmore detail|detailed\b/.test(lower)
        ? ('detailed' as const)
        : /\bbrief|concise|less detail\b/.test(lower)
          ? ('concise' as const)
          : null,
      informationDensity:
        /\b(distract\w*|calm|simpl\w*|easier|focus)\b/.test(lower) ||
        isFocusOnlyRequest(lower)
        ? ('calm' as const)
        : /\bmore detail\b/.test(lower)
          ? ('standard' as const)
          : null,
      preserveTechnicalTerms: /\bkeep technical|technical terms\b/.test(lower)
        ? true
        : null,
      reduceMotion: /\b(motion|animation|calm)\b/.test(lower) ? true : null,
      targetSizePx: /\b(button|control|bigger|larger|small)\b/.test(lower)
        ? 60
        : null,
      textScale: /\b(text|bigger|larger|small)\b/.test(lower) ? 1.35 : null,
    };
    return conversationTurnResponseSchema.parse({
      ...base,
      actionFamily: 'adjust',
      adjustment: next,
      assistantMessage:
        'I adjusted the current AURA presentation. You can return to Original at any time.',
    });
  }

  return conversationTurnResponseSchema.parse({
    ...base,
    actionFamily: 'answer',
    assistantMessage:
      request.semanticPlan?.summary ??
      `I can adjust this page, explain its content, guide a goal, or remember an explicit interface preference.`,
  });
}

/**
 * A schema-valid response is not necessarily useful. Explicit interface
 * requests must retain an actual adjustment, goal, or memory effect; otherwise
 * the next provider gets a chance and deterministic behavior remains the final
 * reliable path.
 */
export function responsePreservesRequestedEffect(
  response: ConversationTurnResponse,
  request: ConversationProviderRequest,
): boolean {
  const expected = deterministicConversationTurn(request);
  switch (expected.actionFamily) {
    case 'adjust':
      return (
        response.adjustment !== null || response.adaptationPatch !== null
      );
    case 'goal_guide':
      return response.intent !== null || response.adaptationPatch !== null;
    case 'remember':
      return response.memoryProposal !== null;
    case 'explain':
      return (
        response.explanation !== null ||
        response.actionFamily === 'explain'
      );
    case 'answer':
      return true;
  }
}

class OllamaConversationProvider implements ConversationProvider {
  readonly #baseUrl: string;
  readonly #contextLength: number;
  readonly #model: string;
  readonly #timeoutMs: number;

  constructor(options: {
    baseUrl: string;
    contextLength: number;
    model: string;
    timeoutMs: number;
  }) {
    this.#baseUrl = options.baseUrl;
    this.#contextLength = options.contextLength;
    this.#model = options.model;
    this.#timeoutMs = options.timeoutMs;
  }

  async turn(
    request: ConversationProviderRequest,
  ): Promise<ConversationTurnResponse> {
    const response = await fetch(`${this.#baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        format: 'json',
        keep_alive: -1,
        messages: [
          {
            role: 'system',
            content: [
              CONVERSATION_INSTRUCTIONS,
              'Return exactly one JSON object and no Markdown or prose outside it.',
              `Use exactly this object shape: ${JSON.stringify(localOutputExample())}`,
            ].join('\n\n'),
          },
          {
            role: 'user',
            content: JSON.stringify(compactLocalConversationContext(request)),
          },
        ],
        model: this.#model,
        options: {
          num_ctx: this.#contextLength,
          num_predict: 700,
          temperature: 0.1,
        },
        stream: false,
        think: false,
      }),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Local conversation model returned HTTP ${response.status}.`);
    }
    const body = (await response.json()) as OllamaConversationResponse;
    const raw = body.message?.content;
    if (!raw) {
      throw new Error('Local conversation model returned no structured response.');
    }
    const output = conversationModelOutputSchema.parse(JSON.parse(raw));
    const inputTokens = body.prompt_eval_count ?? 0;
    const outputTokens = body.eval_count ?? 0;
    return conversationTurnResponseSchema.parse({
      ...output,
      source: 'local',
      usage:
        inputTokens > 0 || outputTokens > 0
          ? {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
            }
          : null,
    });
  }
}

class OpenAIConversationProvider implements ConversationProvider {
  readonly #client: OpenAI;
  readonly #model: string;

  constructor(
    apiKey: string,
    model: string,
    options: { baseURL?: string; timeoutMs?: number } = {},
  ) {
    this.#client = new OpenAI({
      apiKey,
      baseURL: options.baseURL,
      maxRetries: 2,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
  }

  async turn(
    request: ConversationProviderRequest,
  ): Promise<ConversationTurnResponse> {
    const response = await this.#client.responses.parse({
      model: this.#model,
      instructions: CONVERSATION_INSTRUCTIONS,
      input: JSON.stringify({
        currentIntent: request.currentIntent,
        page: compactPageModel(request.page),
        profile: {
          capabilities: request.profile.capabilities,
          learnedPreferences: request.profile.learnedPreferences,
          preferences: request.profile.preferences,
          summary: request.profile.summary,
        },
        recentConversation: request.recentConversation.slice(-8),
        semanticState: compactSemanticPlan(request.semanticPlan),
        userMessage: request.userMessage,
      }),
      max_output_tokens: 2_000,
      reasoning: { effort: 'high' },
      store: false,
      text: {
        format: zodTextFormat(
          conversationModelOutputSchema,
          'aura_conversation_turn',
        ),
        verbosity: 'low',
      },
    });
    if (response.output_parsed === null) {
      throw new Error('AURA received no structured conversation response.');
    }
    return conversationTurnResponseSchema.parse({
      ...response.output_parsed,
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

export function createConversationProvider(
  environment: NodeJS.ProcessEnv = process.env,
): ConversationProvider {
  const localConfig = resolveLocalModelConfig(environment);
  const localEnabled =
    environment.AURA_LOCAL_CONVERSATION?.trim().toLocaleLowerCase() !== '0' &&
    environment.AURA_LOCAL_CONVERSATION?.trim().toLocaleLowerCase() !== 'false';
  const localProvider = localEnabled
    ? new OllamaConversationProvider({
        ...localConfig,
        timeoutMs: resolveLocalTimeout(
          environment.AURA_LOCAL_CONVERSATION_TIMEOUT_MS,
          DEFAULT_LOCAL_TIMEOUT_MS,
        ),
      })
    : null;
  const apiKey = environment.OPENAI_API_KEY?.trim();
  const cloudProvider = apiKey
    ? new OpenAIConversationProvider(
        apiKey,
        environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        {
          ...(environment.OPENAI_BASE_URL?.trim()
            ? { baseURL: environment.OPENAI_BASE_URL.trim() }
            : {}),
          timeoutMs:
            Number.parseInt(environment.AURA_OPENAI_TIMEOUT_MS ?? '', 10) ||
            DEFAULT_TIMEOUT_MS,
        },
      )
    : null;
  return {
    turn: async (request) => {
      const immediate = deterministicConversationTurn(request);
      if (
        isSearchSurfaceRequest(request.userMessage.toLocaleLowerCase()) ||
        isFocusOnlyRequest(request.userMessage.toLocaleLowerCase())
      ) {
        return immediate;
      }
      const providers = {
        cloud: cloudProvider,
        local: localProvider,
      } as const;
      for (const kind of resolveConversationProviderOrder(environment, {
        cloud: cloudProvider !== null,
        local: localProvider !== null,
      })) {
        const provider = providers[kind];
        if (provider === null) continue;
        try {
          const response = await provider.turn(request);
          if (responsePreservesRequestedEffect(response, request)) {
            return response;
          }
          console.warn(
            `[AURA] ${kind} conversation returned no usable interface effect; trying the next safe path.`,
          );
        } catch (error) {
          console.warn(
            `[AURA] ${kind} conversation unavailable; trying the next safe path.`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      if (localProvider === null && cloudProvider === null) {
        console.warn(
          '[AURA] Conversation models are disabled or unavailable; using deterministic guidance.',
        );
      }
      return deterministicConversationTurn(request);
    },
  };
}
