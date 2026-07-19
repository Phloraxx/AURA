// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { LensController } from './lens-controller';

describe('LensController', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders registered targets and removes its overlay cleanly', () => {
    document.body.innerHTML = '<button>Continue</button>';
    const target = document.querySelector('button');
    if (!target) throw new Error('Fixture target is missing.');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, right: 110, bottom: 60, width: 100, height: 40 }),
    });
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    const registry = new ElementRegistry();
    registry.registerSubtree(document);
    const id = registry.getId(target);
    if (!id) throw new Error('Fixture target was not registered.');
    const lens = new LensController(document, registry);
    lens.setSignals([{
      id: 'friction:target',
      category: 'interaction_target',
      source: 'local',
      confidence: 0.9,
      severity: 0.8,
      reason: 'The target is small.',
      targetIds: [id],
      critical: false,
    }]);

    expect(lens.setEnabled(true)).toEqual({ enabled: true });
    expect(document.querySelector('[data-aura-lens-root] [data-aura-lens-marker]')).not.toBeNull();
    expect(lens.select('friction:target')).toEqual({ enabled: true, selectedFrictionId: 'friction:target' });
    expect(scrollIntoView).toHaveBeenCalled();

    lens.setEnabled(false);
    expect(document.querySelector('[data-aura-lens-root]')).toBeNull();
    lens.destroy();
  });
});
