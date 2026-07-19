// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { capabilityProfileSchema, createNeutralProfile } from '@aura/shared';

import { ElementRegistry } from '../page/element-registry';
import { RescueEngine } from './rescue-engine';

describe('RescueEngine', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  function setup() {
    const hasFocusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    document.body.innerHTML = '<button aria-label="Tiny">Tiny</button>';
    const target = document.querySelector('button');
    if (!target) throw new Error('Fixture target is missing.');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 100, right: 110, bottom: 110, width: 10, height: 10 }),
    });
    const registry = new ElementRegistry();
    registry.registerSubtree(document);
    const profile = capabilityProfileSchema.parse({
      ...createNeutralProfile({ id: 'rescue', name: 'Rescue', now: '2026-07-19T00:00:00.000Z' }),
      dimensions: {
        ...createNeutralProfile({ id: 'rescue-2', name: 'Rescue', now: '2026-07-19T00:00:00.000Z' }).dimensions,
        motor: { capacity: 0, confidence: 1, sources: ['self_report'] },
      },
      preferences: { ...createNeutralProfile({ id: 'rescue-3', name: 'Rescue', now: '2026-07-19T00:00:00.000Z' }).preferences, targetSizePx: 44 },
    });
    const suggestions: string[] = [];
    const rescue = new RescueEngine(document, registry, (suggestion) => suggestions.push(suggestion.id));
    rescue.setProfile(profile);
    rescue.setEnabled(true);
    const event = () => document.dispatchEvent(new PointerEvent('pointerup', { clientX: 120, clientY: 105, bubbles: true }));
    return { event, hasFocusSpy, rescue, suggestions };
  }

  it('offers a consent-gated near-miss suggestion and suppresses its cooldown', () => {
    const { event, rescue, suggestions } = setup();
    event();
    event();
    expect(suggestions).toEqual(['rescue:near-miss:aura:n1']);
    expect(rescue.status().suggestion?.recommendationKey).toBe('enlargeTargets');
    rescue.dismiss('rescue:near-miss:aura:n1');
    event();
    event();
    expect(suggestions).toHaveLength(1);
    rescue.destroy();
  });

  it('clears an accepted suggestion, resets interaction history, and prevents immediate re-triggering', () => {
    const { event, rescue, suggestions } = setup();
    event();
    event();
    expect(rescue.status().suggestion).toBeDefined();

    const status = rescue.clearSuggestion();
    event();
    event();

    expect(status.suggestion).toBeUndefined();
    expect(status.enabled).toBe(true);
    expect(rescue.status().suggestion).toBeUndefined();
    expect(suggestions).toHaveLength(1);
    rescue.destroy();
  });

  it('ignores Rescue interaction telemetry when the page is not focused', () => {
    const { event, hasFocusSpy, rescue, suggestions } = setup();
    hasFocusSpy.mockReturnValue(false);

    event();
    event();

    expect(rescue.status().suggestion).toBeUndefined();
    expect(suggestions).toEqual([]);
    rescue.destroy();
  });
});
