// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { scanLocalFriction } from './local-friction-scanner';

describe('local friction scanner performance guardrails', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('bounds style inspection and registry work on very large DOMs', () => {
    document.body.innerHTML = `<div>${'<div class="node">content</div>'.repeat(5_000)}</div>`;
    const original = globalThis.getComputedStyle;
    const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => original(element));
    const registry = new ElementRegistry();
    const registerSpy = vi.spyOn(registry, 'register');

    expect(() => scanLocalFriction(document, registry)).not.toThrow();

    // The scanner samples at most 2,000 page elements and performs motion style
    // inspection on at most 400 of them instead of walking and registering the full DOM.
    expect(getComputedStyleSpy.mock.calls.length).toBeLessThanOrEqual(850);
    expect(registerSpy.mock.calls.length).toBeLessThan(100);
  });
});
