import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  onboardingModelOutputSchema,
  onboardingTurnRequestSchema,
  onboardingTurnResponseSchema,
  type FunctionalArea,
  type OnboardingTurnRequest,
  type OnboardingTurnResponse,
} from '../../shared/profile';
import { ONBOARDING_INSTRUCTIONS } from './prompts/onboarding';

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 20_000;

const QUESTION_BANK: Record<
  FunctionalArea,
  { helpText: string; prompt: string }
> = {
  visual: {
    prompt:
      'When using your usual glasses, zoom, or display settings, how difficult is ordinary website text to read?',
    helpText: 'Think about menus, labels, instructions, and longer paragraphs.',
  },
  auditory: {
    prompt:
      'When a website uses sound or speech, how difficult is it to follow without captions, a transcript, or a visual cue?',
    helpText: 'Choose based on the support you would normally want online.',
  },
  motor: {
    prompt:
      'How difficult is it to select small or closely spaced controls accurately?',
    helpText: 'Think about links, checkboxes, menus, and form buttons.',
  },
  cognitive: {
    prompt:
      'How difficult is it to remember several steps or recover after an error on a website?',
    helpText: 'Think about applications, checkout, booking, and long forms.',
  },
  attention: {
    prompt:
      'How difficult is it to stay focused when a page has motion, pop-ups, sidebars, or many choices?',
    helpText: 'Choose the answer that best matches your usual web experience.',
  },
  language: {
    prompt:
      'How difficult is it to understand long instructions or unfamiliar words on websites?',
    helpText: 'This can include technical, official, or complex language.',
  },
};

const QUESTION_ORDER: FunctionalArea[] = [
  'visual',
  'motor',
  'attention',
  'cognitive',
  'language',
  'auditory',
];

export interface OnboardingProvider {
  turn: (request: OnboardingTurnRequest) => Promise<OnboardingTurnResponse>;
}

function normalizePreference(note: string): string | null {
  const normalized = note.trim().replace(/\s+/g, ' ');
  const expressesInterfacePreference =
    /\b(avoid|button|clutter|control|detail|easier|explain|focus|hard|keep|motion|navigation|need|prefer|read|reduce|show|technical|text)\b/i.test(
      normalized,
    );
  if (normalized.length < 5 || !expressesInterfacePreference) return null;
  return normalized.slice(0, 300);
}

export function deterministicOnboardingTurn(
  untrustedRequest: unknown,
): OnboardingTurnResponse {
  const request = onboardingTurnRequestSchema.parse(untrustedRequest);
  const learnedPreference = normalizePreference(request.userResponse);
  const answered = new Set(request.answers.map((answer) => answer.area));
  const nextArea = QUESTION_ORDER.find((area) => !answered.has(area)) ?? null;

  return onboardingTurnResponseSchema.parse({
    assistantMessage:
      request.answers.length === 0
        ? 'I’ll ask about everyday web tasks, one at a time. There are no right answers.'
        : nextArea === null
          ? 'Thank you. I have enough to prepare your first AURA profile.'
          : 'Thanks. I’ll use that answer to shape what I ask next.',
    complete: nextArea === null,
    confidence: learnedPreference === null ? 0 : 1,
    learnedPreference,
    mascotMood: nextArea === null ? 'celebrating' : 'asking',
    nextQuestion:
      nextArea === null ? null : { area: nextArea, ...QUESTION_BANK[nextArea] },
    source: 'fallback',
    usage: null,
  });
}

class OpenAIOnboardingProvider implements OnboardingProvider {
  readonly #client: OpenAI;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: DEFAULT_TIMEOUT_MS,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    });
    this.#model = model;
  }

  async turn(request: OnboardingTurnRequest): Promise<OnboardingTurnResponse> {
    const parsedRequest = onboardingTurnRequestSchema.parse(request);
    const response = await this.#client.responses.parse({
      model: this.#model,
      instructions: ONBOARDING_INSTRUCTIONS,
      input: JSON.stringify({
        answeredFunctionalAreas: parsedRequest.answers,
        unansweredFunctionalAreas: QUESTION_ORDER.filter(
          (area) =>
            !parsedRequest.answers.some((answer) => answer.area === area),
        ),
        deterministicChoices: parsedRequest.choices,
        latestUserWords: parsedRequest.userResponse,
        canonicalQuestionBank: QUESTION_BANK,
      }),
      max_output_tokens: 700,
      reasoning: { effort: 'high' },
      store: false,
      text: {
        format: zodTextFormat(
          onboardingModelOutputSchema,
          'aura_onboarding_turn',
        ),
      },
    });
    const output = response.output_parsed;
    if (output === null) {
      throw new Error('AURA received no structured onboarding response.');
    }

    const answered = new Set(parsedRequest.answers.map((answer) => answer.area));
    const nextArea = QUESTION_ORDER.find((area) => !answered.has(area)) ?? null;
    const safeNextQuestion =
      nextArea === null
        ? null
        : output.nextQuestion !== null &&
            !answered.has(output.nextQuestion.area)
          ? output.nextQuestion
          : { area: nextArea, ...QUESTION_BANK[nextArea] };

    return onboardingTurnResponseSchema.parse({
      ...output,
      complete: nextArea === null,
      mascotMood: nextArea === null ? 'celebrating' : output.mascotMood,
      nextQuestion: safeNextQuestion,
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

export function createOnboardingProvider(
  environment: NodeJS.ProcessEnv = process.env,
): OnboardingProvider {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      turn: (request) => Promise.resolve(deterministicOnboardingTurn(request)),
    };
  }

  const provider = new OpenAIOnboardingProvider(
    apiKey,
    environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
  );
  return {
    turn: async (request) => {
      try {
        return await provider.turn(request);
      } catch (error) {
        console.warn(
          '[AURA] OpenAI onboarding unavailable; using deterministic fallback.',
          error instanceof Error ? error.message : 'Unknown provider error',
        );
        return deterministicOnboardingTurn(request);
      }
    },
  };
}
