import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

import { DEMO_PROFILES } from '../packages/shared/src/demo-profiles.ts';

interface ExtensionApi {
  tabs: {
    query(options: { url?: string }): Promise<Array<{ id?: number }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  scripting: {
    executeScript(options: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
  storage: {
    local: {
      set(values: Record<string, unknown>): Promise<void>;
    };
  };
}

test('keeps runtime injection idempotent and applies manually remembered site choices', async () => {
  const extensionPath = resolve('apps/extension/.output/chrome-mv3');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const page = await context.newPage();
    await page.goto('http://localhost:4173/cluttered-article.html');

    await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
      await extensionApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/adaptive.js'],
      });
      await extensionApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/adaptive.js'],
      });
      await extensionApi.storage.local.set({
        'aura.sitePreferences.v1': [
          {
            origin: 'http://localhost:4173',
            enabled: true,
            autoAdapt: false,
            preferencePatch: { contrast: 'enhanced' },
            updatedAt: '2026-07-19T00:00:00.000Z',
          },
        ],
      });
    });

    await expect(page.locator('html')).toHaveAttribute('data-aura-runtime', 'ready');

    const status = await serviceWorker.evaluate(async (profile) => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_ADAPT', profile });
    }, DEMO_PROFILES[2]);

    expect(status).toEqual(
      expect.objectContaining({
        adapted: true,
        appliedKinds: expect.arrayContaining(['improveContrast']),
      }),
    );

    const instructionIds = await page
      .locator('style[data-aura-owned][data-aura-instruction]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-aura-instruction')));
    expect(new Set(instructionIds).size).toBe(instructionIds.length);

    await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
      await extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_REVERT' });
    });
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
