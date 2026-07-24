import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  conversationModelOutputSchema,
  conversationTurnResponseSchema,
  type ConversationMessage,
  type ConversationTurnResponse,
  type SessionIntent,
} from '../../shared/conversation';
import type { PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import type { SemanticPlan } from '../../shared/semantic-analysis';
import { compactPageModel } from './page-analysis-provider';
import { CONVERSATION_INSTRUCTIONS } from './prompts/conversation';

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 30_000;

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
    /\b(easier|bigger|larger|small|calm|distract\w*|motion|detail|technical|simpl\w*)\b/.test(
      lower,
    )
  ) {
    const adjustment = emptyAdjustment();
    const next = {
      ...adjustment,
      explanationStyle: /\bmore detail|detailed\b/.test(lower)
        ? ('detailed' as const)
        : /\bbrief|concise|less detail\b/.test(lower)
          ? ('concise' as const)
          : null,
      informationDensity: /\b(distract\w*|calm|simpl\w*|easier)\b/.test(lower)
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
      maxRetries: 1,
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
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      turn: (request) =>
        Promise.resolve(deterministicConversationTurn(request)),
    };
  }
  const provider = new OpenAIConversationProvider(
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
  );
  return {
    turn: async (request) => {
      try {
        return await provider.turn(request);
      } catch (error) {
        console.warn(
          '[AURA] Conversation AI unavailable; using deterministic guidance.',
          error instanceof Error ? error.message : String(error),
        );
        return deterministicConversationTurn(request);
      }
    },
  };
}
