// @vitest-environment happy-dom
import { DEMO_PROFILES, type SemanticPageAnalysis } from '@aura/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createSemanticPolicy } from '../adaptation/policy-engine';
import { TransformEngine } from '../adaptation/transform-engine';
import { ElementRegistry } from './element-registry';
import { extractPageRepresentation } from './semantic-extractor';

function loadFixture(name: string) {
  const html = readFileSync(resolve(process.cwd(), `../../fixtures/${name}`), 'utf8');
  document.open();
  document.write(html);
  document.close();
  const registry = new ElementRegistry();
  const page = extractPageRepresentation(document, registry);
  return { page, registry };
}

function idFor(registry: ElementRegistry, selector: string): string {
  const element = document.querySelector(selector);
  const id = element ? registry.getId(element) : undefined;
  if (!id) throw new Error(`Fixture selector was not registered: ${selector}`);
  return id;
}

describe('repository demo fixtures', () => {
  it('extracts the cluttered article main region and recommendations', () => {
    const { page, registry } = loadFixture('cluttered-article.html');

    expect(page.elements.find(({ id }) => id === idFor(registry, 'main'))?.kind).toBe(
      'landmark',
    );
    expect(page.elements.find(({ id }) => id === idFor(registry, 'aside'))?.text).toMatch(
      /Trending now/u,
    );
  });

  it('omits entered form values and marks required errors as critical', () => {
    const { registry } = loadFixture('complex-form.html');
    const name = document.querySelector<HTMLInputElement>('#full-name');
    if (!name) throw new Error('Complex form input is missing.');
    name.value = 'Private entered name';

    const page = extractPageRepresentation(document, registry);

    expect(JSON.stringify(page)).not.toContain('Private entered name');
    expect(
      page.elements.find(({ id }) => id === idFor(registry, '#form-error'))?.critical,
    ).toBe(true);
  });

  it('highlights the original product action, collapses recommendations, and restores both', () => {
    const { registry } = loadFixture('product-page.html');
    const profile = DEMO_PROFILES[2];
    const cart = document.querySelector<HTMLButtonElement>('#add-to-cart');
    if (!profile || !cart) throw new Error('Product fixture setup is incomplete.');
    const clicked = vi.fn();
    cart.addEventListener('click', clicked);
    const analysis: SemanticPageAnalysis = {
      mainContent: [],
      primaryActions: [
        { id: idFor(registry, '#add-to-cart'), confidence: 0.95, reason: 'Purchase action' },
      ],
      navigation: [],
      distractions: [
        { id: idFor(registry, 'aside'), confidence: 0.9, reason: 'Recommendations' },
      ],
      ambiguousControls: [],
      complexTextBlocks: [],
      formGroups: [],
      warnings: [],
    };
    const engine = new TransformEngine(document, registry);

    engine.applyPlan(createSemanticPolicy(profile, analysis));
    cart.click();
    expect(clicked).toHaveBeenCalledOnce();
    expect(cart.getAttribute('data-aura-primary-action')).toBe('true');
    expect(document.querySelector('aside')?.getAttribute('data-aura-distraction')).toBe(
      'collapsed',
    );

    engine.revertAll();
    expect(cart.hasAttribute('data-aura-primary-action')).toBe(false);
    expect(document.querySelector('aside')?.hasAttribute('data-aura-distraction')).toBe(
      false,
    );
  });
});
