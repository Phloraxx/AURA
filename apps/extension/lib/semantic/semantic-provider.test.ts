import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PageRepresentation, SemanticPageAnalysis, SimplifyTextResponse } from '@aura/shared';

import { createSemanticProvider } from './semantic-provider';

const page: PageRepresentation = {
  title: 'Fixture',
  truncated: false,
  elements: [{ id: 'aura:n1', kind: 'landmark', tag: 'main', critical: false }],
};

const analysis: SemanticPageAnalysis = {
  mainContent: [],
  primaryActions: [],
  navigation: [],
  distractions: [],
  ambiguousControls: [],
  complexTextBlocks: [],
  formGroups: [],
  warnings: [],
};

const simplified: SimplifyTextResponse = {
  simplifiedText: 'Start now.',
  requiresOriginal: false,
  warnings: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('semantic provider fallback chain', () => {
  it('uses the remote contract when local browser AI is unavailable', async () => {
    const remote = {
      analyzePage: vi.fn().mockResolvedValue(analysis),
      simplifyText: vi.fn().mockResolvedValue(simplified),
    };
    const provider = createSemanticProvider(remote);

    await expect(provider.analyzePage(page)).resolves.toEqual(analysis);
    await expect(provider.simplifyText({ text: 'Begin.', desiredLevel: 'simple' })).resolves.toEqual(simplified);
    expect(provider.kind()).toBe('remote');
  });

  it('uses a feature-detected LanguageModel and validates local JSON output', async () => {
    const remote = {
      analyzePage: vi.fn().mockResolvedValue(analysis),
      simplifyText: vi.fn().mockResolvedValue(simplified),
    };
    const prompt = vi.fn().mockResolvedValue(JSON.stringify(analysis));
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    });
    const provider = createSemanticProvider(remote);

    await expect(provider.analyzePage(page)).resolves.toEqual(analysis);
    expect(prompt).toHaveBeenCalled();
    expect(remote.analyzePage).not.toHaveBeenCalled();
    expect(provider.kind()).toBe('on_device');
  });
});
