import type { PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import {
  localRecomposeOutputSchema,
  type LocalRecomposeOutput,
  type RecomposePreset,
} from '../../shared/recompose';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3.5:4b-mlx';
const REQUEST_TIMEOUT_MS = 8_000;

const outputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    archetype: {
      type: 'string',
      enum: ['article', 'listing', 'detail', 'form', 'dashboard', 'general'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    primaryTargetIds: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string' },
    },
    resultTargetIds: {
      type: 'array',
      maxItems: 10,
      items: { type: 'string' },
    },
    sectionOrder: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'string',
        enum: ['actions', 'results', 'content', 'form', 'facts'],
      },
    },
    supportingTargetIds: {
      type: 'array',
      maxItems: 12,
      items: { type: 'string' },
    },
    summary: { type: 'string', maxLength: 260 },
  },
  required: [
    'archetype',
    'confidence',
    'primaryTargetIds',
    'resultTargetIds',
    'sectionOrder',
    'supportingTargetIds',
    'summary',
  ],
} as const;

interface OllamaChatResponse {
  done?: boolean;
  load_duration?: number;
  message?: { content?: string };
  total_duration?: number;
}

export interface LocalRecomposeProviderResult {
  durationMs: number;
  error: string | null;
  model: string;
  output: LocalRecomposeOutput | null;
}

export interface LocalRecomposeProvider {
  analyze: (input: {
    currentGoal: string | null;
    page: PageModel;
    preset: RecomposePreset;
    profile: BrowserProfile;
  }) => Promise<LocalRecomposeProviderResult>;
  warm: () => Promise<boolean>;
}

function compactPage(page: PageModel): string {
  const ranked = [...page.elements]
    .filter((element) => element.visible)
    .sort((left, right) => right.score - left.score)
    .slice(0, 90)
    .map((element) => ({
      id: element.auraId,
      category: element.category,
      role: element.role,
      name: element.accessibleName,
      text: element.text?.replace(/\s+/g, ' ').trim().slice(0, 240) ?? null,
      interactive: element.interactive,
      form: element.formAuraId,
      repetition: element.repetitionKey,
      href: element.href === null ? null : 'link',
      inViewport: element.inViewport,
      score: Math.round(element.score * 100) / 100,
    }));
  return JSON.stringify({
    title: page.title,
    url: page.url,
    forms: page.forms,
    repeatedStructures: page.repeatedStructures.slice(0, 8),
    elements: ranked,
  });
}

function promptFor(input: {
  currentGoal: string | null;
  page: PageModel;
  preset: RecomposePreset;
  profile: BrowserProfile;
}): string {
  return [
    'You are the fast local structural planner for AURA, a personalized accessibility browser.',
    'Your job is ONLY to choose which existing page targets should appear in a redesigned AURA interface.',
    'Never invent an auraId. Never output HTML, JavaScript, CSS, URLs, or instructions to execute code.',
    'Prefer the fewest targets that preserve the page purpose and the person\'s likely task.',
    'For listing/marketplace/search pages, resultTargetIds should point to repeated result/card-like targets when available.',
    'For forms, resultTargetIds should point to the most important form controls in sensible order.',
    'primaryTargetIds should contain the most useful real actions/controls.',
    'supportingTargetIds should contain useful headings/text/regions, not navigation clutter.',
    'sectionOrder must contain only the provided section names.',
    `Preset: ${input.preset}`,
    `Profile: ${input.profile.summary || JSON.stringify(input.profile.preferences)}`,
    `Current goal: ${input.currentGoal ?? 'none'}`,
    `Page model: ${compactPage(input.page)}`,
  ].join('\n\n');
}

export function createLocalRecomposeProvider(): LocalRecomposeProvider {
  const baseUrl = (process.env.AURA_OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
  const model = process.env.AURA_LOCAL_MODEL?.trim() || DEFAULT_MODEL;

  async function warm(): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: '',
          stream: false,
          keep_alive: -1,
        }),
        signal: AbortSignal.timeout(6_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function analyze(input: {
    currentGoal: string | null;
    page: PageModel;
    preset: RecomposePreset;
    profile: BrowserProfile;
  }): Promise<LocalRecomposeProviderResult> {
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: promptFor(input) }],
          stream: false,
          think: false,
          keep_alive: -1,
          format: outputJsonSchema,
          options: { temperature: 0 },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
      if (!response.ok) {
        return {
          durationMs,
          error: `Local model returned HTTP ${response.status}.`,
          model,
          output: null,
        };
      }
      const body = (await response.json()) as OllamaChatResponse;
      const raw = body.message?.content;
      if (!raw) {
        return { durationMs, error: 'Local model returned no structured content.', model, output: null };
      }
      const parsed = localRecomposeOutputSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return { durationMs, error: 'Local model returned an invalid Recompose plan.', model, output: null };
      }
      return { durationMs, error: null, model, output: parsed.data };
    } catch (error) {
      return {
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
        error: error instanceof Error ? error.message : 'Local AURA model is unavailable.',
        model,
        output: null,
      };
    }
  }

  return { analyze, warm };
}
