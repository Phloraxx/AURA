// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { observeDynamicPage } from './mutation-observer';

describe('observeDynamicPage', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces host-page insertions and ignores AURA-owned insertions', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main>Original</main>';
    const changed = vi.fn();
    const observer = observeDynamicPage(document, changed, 300);

    const auraNode = document.createElement('button');
    auraNode.dataset.auraOwned = 'true';
    document.body.append(auraNode);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(300);
    expect(changed).not.toHaveBeenCalled();

    document.body.append(document.createElement('section'));
    document.body.append(document.createElement('p'));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(299);
    expect(changed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(changed).toHaveBeenCalledOnce();

    observer.disconnect();
  });
});
