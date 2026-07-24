import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PageModel } from '../../shared/page-model';
import { createDefaultBrowserProfile } from '../../shared/profile';
import { createLocalRecomposeProvider } from './local-recompose-provider';

function page(): PageModel {
  return {
    capturedAt: '2026-07-24T00:00:00.000Z',
    elements: [
      {
        accessibleName: 'Search services',
        auraId: 'search',
        category: 'control',
        childCount: 0,
        display: 'block',
        fontSizePx: 16,
        fontWeight: '400',
        formAuraId: null,
        headingLevel: null,
        href: null,
        inViewport: true,
        inputType: 'search',
        interactive: true,
        landmark: null,
        lineHeightPx: 22,
        position: 'static',
        rect: { height: 48, width: 400, x: 20, y: 20 },
        repetitionKey: null,
        role: 'textbox',
        score: 20,
        states: {
          checked: null,
          disabled: false,
          expanded: null,
          selected: null,
        },
        tag: 'input',
        text: 'Search services',
        textLength: 15,
        visible: true,
      },
    ],
    extractionHealth: {
      enoughTargets: true,
      formLabelCoverage: 1,
      hasHeading: false,
      hasInteractive: true,
      hasPrimaryRegion: true,
      score: 1,
    },
    forms: [],
    metrics: {
      candidateCount: 1,
      captureDurationMs: 5,
      mutationCount: 0,
      selectedCount: 1,
      trigger: 'manual',
    },
    pageId: 'page-1',
    privacy: {
      hasEditableControl: true,
      hasNonEmptyEditableControl: false,
      hasPasswordControl: false,
    },
    regions: [],
    repeatedStructures: [],
    revision: 1,
    schemaVersion: 1,
    title: 'Marketplace',
    url: 'https://example.com',
    viewport: { height: 900, scrollX: 0, scrollY: 0, width: 1280 },
    visibleAuraIds: ['search'],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AURA_LOCAL_MODEL;
  delete process.env.AURA_OLLAMA_URL;
});

describe('local Recompose provider', () => {
  it('uses the MLX Qwen default with a structured non-thinking request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        message: {
          content: JSON.stringify({
            archetype: 'listing',
            confidence: 0.94,
            primaryTargetIds: ['search'],
            resultTargetIds: [],
            sectionOrder: ['actions', 'content'],
            supportingTargetIds: [],
            summary: 'Keep the real search control prominent.',
          }),
        },
      }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = createLocalRecomposeProvider();
    const profile = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-1',
    );

    const result = await provider.analyze({
      currentGoal: 'Find a logo designer',
      page: page(),
      preset: 'clear_calm',
      profile,
    });

    expect(result.error).toBeNull();
    expect(result.model).toBe('qwen3.5:4b-mlx');
    expect(result.output?.primaryTargetIds).toEqual(['search']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        keep_alive: -1,
        model: 'qwen3.5:4b-mlx',
        stream: false,
        think: false,
      }),
    );
    expect(body.format).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        type: 'object',
      }),
    );
  });

  it('fails closed when the local model does not return the schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ message: { content: '{"archetype":"listing"}' } }),
        ok: true,
        status: 200,
      }),
    );
    const provider = createLocalRecomposeProvider();
    const profile = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-1',
    );

    const result = await provider.analyze({
      currentGoal: null,
      page: page(),
      preset: 'personalized',
      profile,
    });

    expect(result.output).toBeNull();
    expect(result.error).toBe('Local model returned an invalid Recompose plan.');
  });

  it('warms the configured model without requiring generation output', async () => {
    process.env.AURA_LOCAL_MODEL = 'qwen3.5:4b-mlx';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const provider = createLocalRecomposeProvider();

    await expect(provider.warm()).resolves.toBe(true);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/api/generate');
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        keep_alive: -1,
        model: 'qwen3.5:4b-mlx',
        prompt: '',
        stream: false,
      }),
    );
  });
});
