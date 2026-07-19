// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { TransformEngine } from './transform-engine';


describe('safety-aware focus mode', () => {
  it('collapses ordinary complementary content but preserves critical and primary-contained regions', () => {
    document.documentElement.removeAttribute('data-aura-active');
    document.head.innerHTML = '<title>Fixture</title>';
    document.body.innerHTML = `
      <main id="main">
        <h1>Article</h1>
        <p>Primary content</p>
        <aside id="inline-note">Context that is part of the article.</aside>
      </main>
      <aside id="related">Related stories</aside>
      <aside id="critical"><strong>Security warning</strong><p>Review this warning before continuing.</p></aside>
    `;
    const registry = new ElementRegistry();
    registry.registerSubtree(document);
    const main = document.querySelector('#main');
    if (!main) throw new Error('Main fixture is missing.');
    const mainId = registry.getId(main) ?? registry.register(main);
    const engine = new TransformEngine(document, registry);

    engine.applyPlan({
      version: 1,
      instructions: [
        {
          id: 'deterministic:focusMainContent',
          kind: 'focusMainContent',
          source: 'deterministic',
          targetIds: [mainId],
          reason: 'Fixture focus mode',
        },
      ],
    });

    expect(document.querySelector('#related')?.getAttribute('data-aura-secondary')).toBe('collapsed');
    expect(document.querySelector('#critical')?.hasAttribute('data-aura-secondary')).toBe(false);
    expect(document.querySelector('#inline-note')?.hasAttribute('data-aura-secondary')).toBe(false);
    expect(document.querySelectorAll('[data-aura-focus-control]')).toHaveLength(1);

    engine.revertAll();
    expect(document.querySelector('#related')?.hasAttribute('data-aura-secondary')).toBe(false);
    expect(document.querySelector('#inline-note')?.hasAttribute('data-aura-secondary')).toBe(false);
    expect(document.querySelectorAll('[data-aura-focus-control]')).toHaveLength(0);
  });
});
