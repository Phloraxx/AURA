// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { TransformEngine } from './transform-engine';

function idFor(registry: ElementRegistry, element: Element): string {
  return registry.getId(element) ?? registry.register(element);
}

describe('safety-aware distraction collapsing', () => {
  it('never collapses primary content and keeps secondary restore controls compact', () => {
    document.documentElement.removeAttribute('data-aura-active');
    document.head.innerHTML = '<title>Fixture</title>';
    document.body.innerHTML = `
      <div class="layout">
        <main id="main"><article id="article"><h1>Primary article</h1></article></main>
        <aside id="secondary">Related links</aside>
      </div>
    `;
    const registry = new ElementRegistry();
    registry.registerSubtree(document);
    const main = document.querySelector('#main');
    const article = document.querySelector('#article');
    const secondary = document.querySelector('#secondary');
    if (!main || !article || !secondary) throw new Error('Fixture elements are missing.');

    const engine = new TransformEngine(document, registry);
    engine.applyPlan({
      version: 1,
      instructions: [{
        id: 'semantic:collapse-distractions',
        kind: 'collapseDistractions',
        source: 'semantic_ai',
        targetIds: [idFor(registry, main), idFor(registry, article), idFor(registry, secondary)],
        reason: 'Collapse secondary content only.',
      }],
    });

    expect(main.hasAttribute('data-aura-distraction')).toBe(false);
    expect(article.hasAttribute('data-aura-distraction')).toBe(false);
    expect(secondary.getAttribute('data-aura-distraction')).toBe('collapsed');
    expect(document.querySelectorAll('[data-aura-distraction-control]')).toHaveLength(1);
    expect(document.querySelector('style[data-aura-instruction="semantic:collapse-distractions"]')?.textContent)
      .toContain('align-self: start');

    engine.revertAll();
    expect(secondary.hasAttribute('data-aura-distraction')).toBe(false);
    expect(document.querySelectorAll('[data-aura-distraction-control]')).toHaveLength(0);
  });
});
