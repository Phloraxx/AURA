// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { scanLocalFriction } from './local-friction-scanner';


describe('local friction scanner performance guardrails', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('bounds motion inspection on very large DOMs', () => {
    document.body.innerHTML = `<div>${'<div class="node">content</div>'.repeat(1_200)}</div>`;
    const original = globalThis.getComputedStyle;
    const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => original(element));

    expect(() => scanLocalFriction(document, new ElementRegistry())).not.toThrow();

    // Motion detection is intentionally capped at 400 nodes. Visibility checks may
    // request one additional computed style per inspected node, so stay well below
    // a whole-DOM 1,200-node traversal budget.
    expect(getComputedStyleSpy.mock.calls.length).toBeLessThanOrEqual(850);
  });
});
