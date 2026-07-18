// @vitest-environment happy-dom

import {
  DEMO_PROFILES,
  type AdaptationPlan,
  type CapabilityProfile,
} from '@aura/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { extractLocalPageSignals } from '../page/local-signals';
import { createDeterministicPolicy } from './policy-engine';
import { TransformEngine } from './transform-engine';

const CLUTTERED_ARTICLE = readFileSync(
  resolve(process.cwd(), '../../fixtures/cluttered-article.html'),
  'utf8',
);

function fullProfile(): CapabilityProfile {
  const base = DEMO_PROFILES[0];
  if (!base) throw new Error('Demo profile fixture is missing.');
  return {
    ...base,
    preferences: {
      ...base.preferences,
      reduceMotion: true,
      focusMode: true,
    },
  };
}

function createEngine(profile = fullProfile()) {
  const registry = new ElementRegistry();
  const signals = extractLocalPageSignals(document, registry);
  const plan = createDeterministicPolicy(profile, signals);
  return { engine: new TransformEngine(document, registry), plan, registry };
}

describe('TransformEngine deterministic primitives', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-aura-active');
    document.head.innerHTML = '<title>Fixture</title>';
    document.body.innerHTML = `
      <nav><a href="#main">Skip</a></nav>
      <main id="main"><h1>Readable article</h1><p>Original text</p>
        <form><label>Name <input id="name" value="initial"></label><button>Send</button></form>
      </main>
      <aside data-aura-secondary="host-value"><p>Recommendations</p></aside>
    `;
  });

  it('applies all eight primitives idempotently and preserves host interaction', () => {
    const input = document.querySelector<HTMLInputElement>('#name');
    const button = document.querySelector<HTMLButtonElement>('button');
    if (!input || !button) throw new Error('Fixture controls are missing.');
    input.value = 'user-entered';
    const clicked = vi.fn();
    button.addEventListener('click', clicked);

    const { engine, plan } = createEngine();
    const first = engine.applyPlan(plan);
    const second = engine.applyPlan(plan);

    expect(first.appliedKinds).toHaveLength(8);
    expect(second.appliedKinds).toHaveLength(8);
    expect(document.querySelectorAll('style[data-aura-owned]')).toHaveLength(8);
    expect(document.querySelectorAll('[data-aura-focus-control]')).toHaveLength(1);
    expect(input.value).toBe('user-entered');
    button.click();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('restores every owned marker and keeps form state on Undo all', () => {
    const input = document.querySelector<HTMLInputElement>('#name');
    const aside = document.querySelector('aside');
    if (!input || !aside) throw new Error('Fixture nodes are missing.');
    input.value = 'survives-undo';

    const { engine, plan } = createEngine();
    engine.applyPlan(plan);
    const showButton = document.querySelector<HTMLButtonElement>(
      '[data-aura-focus-control]',
    );
    showButton?.click();
    expect(aside.getAttribute('data-aura-secondary')).toBe('shown');

    const status = engine.revertAll();

    expect(status.adapted).toBe(false);
    expect(document.documentElement.hasAttribute('data-aura-active')).toBe(false);
    expect(document.querySelectorAll('style[data-aura-owned]')).toHaveLength(0);
    expect(document.querySelector('[data-aura-focus-control]')).toBeNull();
    expect(document.querySelector('[data-aura-primary-content]')).toBeNull();
    expect(aside.getAttribute('data-aura-secondary')).toBe('host-value');
    expect(input.value).toBe('survives-undo');
  });

  it('reconciles a changed profile without duplicating transformations', () => {
    const { engine, plan } = createEngine();
    engine.applyPlan(plan);
    const attentionProfile = DEMO_PROFILES[2];
    if (!attentionProfile) throw new Error('Demo profile fixture is missing.');
    const nextPlan = createDeterministicPolicy(
      attentionProfile,
      extractLocalPageSignals(document, engine.registry),
    );

    const status = engine.reconcilePlan(nextPlan);

    expect(status.appliedKinds).toEqual([
      'increaseLineSpacing',
      'limitReadingWidth',
      'reduceMotion',
      'enhanceFocusIndicators',
      'focusMainContent',
    ]);
    expect(document.querySelectorAll('style[data-aura-owned]')).toHaveLength(5);
  });

  it('adapts the repository article fixture differently for two profiles', () => {
    document.open();
    document.write(CLUTTERED_ARTICLE);
    document.close();
    const lowVision = DEMO_PROFILES[0];
    const attention = DEMO_PROFILES[2];
    if (!lowVision || !attention) throw new Error('Demo profiles are missing.');

    const lowVisionRuntime = createEngine(lowVision);
    const lowVisionStatus = lowVisionRuntime.engine.applyPlan(lowVisionRuntime.plan);
    expect(lowVisionStatus.appliedKinds).toContain('improveContrast');
    expect(lowVisionStatus.appliedKinds).not.toContain('focusMainContent');
    lowVisionRuntime.engine.revertAll();

    const attentionRuntime = createEngine(attention);
    const attentionStatus = attentionRuntime.engine.applyPlan(attentionRuntime.plan);
    expect(attentionStatus.appliedKinds).toContain('focusMainContent');
    expect(attentionStatus.appliedKinds).toContain('reduceMotion');
    expect(document.querySelector('aside')?.getAttribute('data-aura-secondary')).toBe(
      'collapsed',
    );
  });

  it('handles missing registered targets and newly inserted content safely', () => {
    const { engine, plan } = createEngine();
    document.querySelector('main')?.remove();
    expect(() => engine.applyPlan(plan)).not.toThrow();

    const dynamicAside = document.createElement('aside');
    dynamicAside.textContent = 'New recommendations';
    document.body.append(dynamicAside);
    engine.refreshDynamicContent();
    engine.refreshDynamicContent();

    expect(dynamicAside.getAttribute('data-aura-secondary')).toBe('collapsed');
    expect(document.querySelectorAll('[data-aura-focus-control]')).toHaveLength(2);
  });

  it('ignores later semantic instructions in the deterministic engine', () => {
    const { engine, plan } = createEngine();
    const invalidPlan: AdaptationPlan = {
      ...plan,
      instructions: [
        ...plan.instructions,
        {
          id: 'semantic:later',
          kind: 'collapseDistractions',
          source: 'semantic_ai',
          reason: 'A later-phase instruction is ignored by the deterministic engine.',
        },
      ],
    };

    const status = engine.applyPlan(invalidPlan);
    expect(status.appliedKinds).toHaveLength(8);
    expect(status.errors).toEqual([]);
  });
});
