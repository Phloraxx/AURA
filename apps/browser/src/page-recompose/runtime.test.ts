// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecomposePlan } from '../shared/recompose';
import { createPageRecomposeRuntime } from './runtime';

function plan(
  preset: RecomposePlan['preset'] = 'clear_calm',
): RecomposePlan {
  return {
    archetype: 'listing',
    pageId: 'page-1',
    preset,
    revision: 1,
    sections: [
      {
        id: 'actions',
        items: [
          {
            action: {
              auraId: 'real-button',
              behavior: 'click',
              label: 'Choose this service',
              prominence: 'primary',
            },
            description: 'A real action from the original page.',
            id: 'action-1',
            meta: ['Real control'],
            targetAuraId: 'real-button',
            title: 'Best next action',
          },
        ],
        kind: 'actions',
        title: 'What you can do',
      },
      {
        id: 'results',
        items: [
          {
            action: {
              auraId: 'result-one',
              behavior: 'scroll',
              label: 'Show source',
              prominence: 'secondary',
            },
            description: '₹3,200 · 4.9 rating',
            id: 'result-1',
            meta: ['Marketplace result'],
            targetAuraId: 'result-one',
            title: 'Minimal logo design',
          },
        ],
        kind: 'results',
        title: 'Best matches',
      },
    ],
    source: 'deterministic',
    subtitle: 'AURA rebuilt this page around what matters.',
    summary: null,
    title: 'Find a logo designer',
  };
}

function installFixture(): void {
  document.head.innerHTML = '';
  document.body.innerHTML = `
    <main>
      <label for="draft">Project brief</label>
      <textarea id="draft">Keep this exact draft</textarea>
      <button data-aura-id="real-button" type="button">Original action</button>
      <article data-aura-id="result-one">Original marketplace result</article>
    </main>
  `;
}

describe('AURA Recompose runtime', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-aura-recomposed');
    installFixture();
    vi.restoreAllMocks();
  });

  it('creates a full-page AURA surface without replacing the original DOM', () => {
    const runtime = createPageRecomposeRuntime();

    const result = runtime.applyPlan(plan(), true);

    expect(result.status).toBe('applied');
    expect(document.documentElement.dataset.auraRecomposed).toBe('on');
    expect(document.querySelector('[data-aura-recompose-root]')).not.toBeNull();
    expect(document.querySelector('[data-aura-id="real-button"]')).not.toBeNull();
    expect(document.querySelector<HTMLTextAreaElement>('#draft')?.value).toBe(
      'Keep this exact draft',
    );
  });

  it('bridges a Recompose action to the real website control', () => {
    const runtime = createPageRecomposeRuntime();
    const realButton = document.querySelector<HTMLButtonElement>(
      '[data-aura-id="real-button"]',
    );
    const clicked = vi.fn();
    realButton?.addEventListener('click', clicked);
    runtime.applyPlan(plan(), true);

    const auraButton = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-aura-recompose-root] button',
      ),
    ].find((button) => button.textContent === 'Choose this service');
    auraButton?.click();

    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('restores Original and then rebuilds AURA without losing form state', () => {
    const runtime = createPageRecomposeRuntime();
    runtime.applyPlan(plan(), true);
    const draft = document.querySelector<HTMLTextAreaElement>('#draft');
    if (draft !== null) draft.value = 'Judge typed this after AURA opened';

    const original = runtime.setView('page-1', 'original');
    expect(original.status).toBe('restored');
    expect(document.querySelector('[data-aura-recompose-root]')).toBeNull();
    expect(draft?.value).toBe('Judge typed this after AURA opened');

    const aura = runtime.setView('page-1', 'aura');
    expect(aura.status).toBe('applied');
    expect(document.querySelector('[data-aura-recompose-root]')).not.toBeNull();
    expect(draft?.value).toBe('Judge typed this after AURA opened');
  });

  it('makes Step by Step genuinely progressive', () => {
    const runtime = createPageRecomposeRuntime();
    runtime.applyPlan(plan('step_by_step'), true);

    expect(document.body.textContent).toContain('Step 1 of 2');
    const sections = [
      ...document.querySelectorAll<HTMLElement>('.aura-r-section'),
    ];
    expect(sections[0]?.hidden).toBe(false);
    expect(sections[1]?.hidden).toBe(true);

    const next = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Next',
    );
    next?.click();

    expect(document.body.textContent).toContain('Step 2 of 2');
    expect(sections[0]?.hidden).toBe(true);
    expect(sections[1]?.hidden).toBe(false);
  });

  it('treats Original as a safe no-op before a Recompose session exists', () => {
    const runtime = createPageRecomposeRuntime();

    expect(runtime.setView('page-1', 'original')).toEqual(
      expect.objectContaining({
        error: null,
        status: 'restored',
        view: 'original',
      }),
    );
  });
});
