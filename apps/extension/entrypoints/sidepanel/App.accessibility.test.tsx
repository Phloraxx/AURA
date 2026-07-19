// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('side panel accessibility', () => {
  beforeEach(() => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: vi.fn((keys: string[]) =>
            Promise.resolve(
              Object.fromEntries(keys.map((key) => [key, stored[key]])),
            ),
          ),
          set: vi.fn((values: Record<string, unknown>) => {
            Object.assign(stored, values);
            return Promise.resolve();
          }),
        },
      },
      tabs: { query: vi.fn(() => Promise.resolve([])) },
      scripting: { executeScript: vi.fn() },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('has no automated structural violations on profile and setup routes', async () => {
    const { App } = await import('./App');
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'How would you like to set up AURA?' });

    const setupResults = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(setupResults.violations).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Return to profiles' }));
    await screen.findByRole('heading', { name: 'Your adaptation setup' });
    const profileResults = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(profileResults.violations).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Page' }));
    await screen.findByRole('heading', { name: 'See where AURA can help' });
    const pageResults = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(pageResults.violations).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Task' }));
    await screen.findByRole('heading', { name: 'What are you trying to do?' });
    const taskResults = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(taskResults.violations).toEqual([]);
  });
});
