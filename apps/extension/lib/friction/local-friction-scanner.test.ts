// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { scanLocalFriction } from './local-friction-scanner';

function loadFixture(name: string): ElementRegistry {
  const html = readFileSync(resolve(process.cwd(), `../../fixtures/${name}`), 'utf8');
  document.open();
  document.write(html);
  document.close();
  const registry = new ElementRegistry();
  registry.registerSubtree(document);
  return registry;
}

describe('local friction scanner', () => {
  it('finds readability, attention, and motion signals on the article fixture', () => {
    const registry = loadFixture('cluttered-article.html');
    const ticker = document.querySelector<HTMLElement>('.ticker');
    if (!ticker) throw new Error('Animated ticker fixture is missing.');

    // happy-dom does not reliably resolve stylesheet keyframes into computed animation values.
    // Mirror the fixture's declared animation inline so this unit test exercises scanner logic,
    // while the browser audit continues to verify real computed styles in Chromium.
    ticker.style.animationName = 'pulse';
    ticker.style.animationDuration = '1.4s';

    const signals = scanLocalFriction(document, registry);

    expect(signals.some(({ category }) => category === 'readability')).toBe(true);
    expect(signals.some(({ category }) => category === 'attention_clutter')).toBe(true);
    expect(signals.some(({ category }) => category === 'motion')).toBe(true);
    expect(signals.every(({ targetIds }) => targetIds.every((id) => registry.has(id)))).toBe(true);
  });

  it('finds form-complexity signals without exposing entered values', () => {
    const registry = loadFixture('complex-form.html');
    const name = document.querySelector<HTMLInputElement>('#full-name');
    if (!name) throw new Error('Form fixture input is missing.');
    name.value = 'Private entered name';

    const signals = scanLocalFriction(document, registry);
    expect(signals.some(({ category }) => category === 'form_complexity')).toBe(true);
    expect(JSON.stringify(signals)).not.toContain('Private entered name');
  });

  it('finds interaction friction on the product fixture', () => {
    const registry = loadFixture('product-page.html');
    const signals = scanLocalFriction(document, registry);

    expect(signals.some(({ category }) => category === 'interaction_target')).toBe(true);
    expect(signals.some(({ category }) => category === 'control_clarity')).toBe(true);
  });
});
