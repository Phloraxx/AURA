import type { PageElement, PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import {
  localRecomposeOutputSchema,
  type LocalRecomposeOutput,
  type RecomposePreset,
} from '../../shared/recompose';
import { resolveLocalModelConfig } from './local-model-config';

// The event Mac produced validated plans in roughly 4.5–11.2 seconds. The
// deterministic surface is already usable during this request, so a little
// headroom is safer than dropping a valid warm-model result at 12 seconds.
const REQUEST_TIMEOUT_MS = 16_000;

interface OllamaChatResponse {
  done?: boolean;
  load_duration?: number;
  message?: { content?: string };
  total_duration?: number;
}

interface OllamaProcessResponse {
  models?: Array<{
    context_length?: number;
    model?: string;
    name?: string;
  }>;
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

function selectLocalTargets(page: PageModel): PageElement[] {
  const visible = [...page.elements]
    .filter((element) => element.visible)
    .sort((left, right) => right.score - left.score);
  const selected = new Map<string, PageElement>();
  const add = (elements: PageElement[], limit: number): void => {
    for (const element of elements) {
      if (selected.size >= 36 || limit <= 0) return;
      if (selected.has(element.auraId)) continue;
      selected.set(element.auraId, element);
      limit -= 1;
    }
  };
  const byIds = (ids: string[]): PageElement[] => {
    const wanted = new Set(ids);
    return visible.filter((element) => wanted.has(element.auraId));
  };

  add(
    byIds(page.forms.flatMap((form) => form.controlAuraIds)).filter(
      (element) => element.interactive,
    ),
    10,
  );
  add(
    byIds(
      page.repeatedStructures.flatMap(
        (structure) => structure.representativeAuraIds,
      ),
    ),
    10,
  );
  add(visible.filter((element) => element.interactive), 10);
  add(visible.filter((element) => element.category === 'heading'), 6);
  add(
    visible.filter(
      (element) =>
        element.category === 'region' ||
        element.category === 'text' ||
        element.category === 'list',
    ),
    8,
  );
  add(visible, 36 - selected.size);
  return [...selected.values()];
}

function compactPage(page: PageModel): string {
  const ranked = selectLocalTargets(page).map((element) => ({
    id: element.auraId,
    category: element.category,
    role: element.role,
    name: element.accessibleName,
    text: element.text?.replace(/\s+/g, ' ').trim().slice(0, 160) ?? null,
    interactive: element.interactive,
    form: element.formAuraId,
    repetition: element.repetitionKey,
    inViewport: element.inViewport,
    score: Math.round(element.score * 10) / 10,
  }));
  return JSON.stringify({
    title: page.title,
    host: (() => {
      try {
        return new URL(page.url).hostname;
      } catch {
        return 'unknown';
      }
    })(),
    forms: page.forms.slice(0, 5),
    repeatedStructures: page.repeatedStructures.slice(0, 6),
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
    'Return exactly one JSON object and nothing else. Do not use Markdown or explanatory prose.',
    'Use one allowed value per field. Never join alternatives with "|" inside a string.',
    'Allowed archetype values: article, listing, detail, form, dashboard, general.',
    'Allowed sectionOrder values: actions, results, content, form, facts.',
    'The JSON object must have exactly these keys and this shape:',
    JSON.stringify({
      archetype: 'form',
      confidence: 0.9,
      primaryTargetIds: ['continue-button'],
      resultTargetIds: ['first-form-field'],
      sectionOrder: ['form', 'actions'],
      supportingTargetIds: ['page-heading'],
      summary: 'A short description of the useful page structure.',
    }),
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
  const { baseUrl, contextLength, model } = resolveLocalModelConfig();

  async function unloadMismatchedContext(): Promise<void> {
    try {
      const processes = await fetch(`${baseUrl}/api/ps`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!processes.ok) return;
      const body = (await processes.json()) as OllamaProcessResponse;
      const running = body.models?.find(
        (candidate) =>
          candidate.model === model || candidate.name === model,
      );
      if (
        running === undefined ||
        running.context_length === undefined ||
        running.context_length === contextLength
      ) {
        return;
      }
      await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keep_alive: 0, model }),
        signal: AbortSignal.timeout(6_000),
      });
    } catch {
      // Context verification is best-effort; the ordinary warm request still
      // provides a reliable availability signal and safe app fallback.
    }
  }

  async function warm(): Promise<boolean> {
    try {
      await unloadMismatchedContext();
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: '',
          stream: false,
          keep_alive: -1,
          options: { num_ctx: contextLength },
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
          messages: [
            {
              role: 'system',
              content:
                'Return one compact JSON object only. Never return Markdown, analysis, or prose outside JSON.',
            },
            { role: 'user', content: promptFor(input) },
          ],
          stream: false,
          think: false,
          keep_alive: -1,
          // The current MLX runner reliably honors Ollama JSON mode but does
          // not consistently enforce a full JSON Schema passed as `format`.
          // AURA still validates the response against its stricter Zod schema.
          format: 'json',
          options: {
            num_ctx: contextLength,
            num_predict: 320,
            temperature: 0,
          },
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
