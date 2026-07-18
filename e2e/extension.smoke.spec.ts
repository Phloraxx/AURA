import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

import { DEMO_PROFILES } from '../packages/shared/src/demo-profiles.ts';

interface ExtensionApi {
  tabs: {
    query(options: {
      active?: boolean;
      currentWindow?: boolean;
      url?: string;
    }): Promise<Array<{ id?: number }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  scripting: {
    executeScript(options: {
      target: { tabId: number };
      files: string[];
    }): Promise<unknown>;
  };
}

test('loads the MV3 extension, switches deterministic profiles, and undoes without reload', async () => {
  const extensionPath = resolve('apps/extension/.output/chrome-mv3');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });
  try {
    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extensionId = serviceWorker.url().split('/')[2];
    if (!extensionId) throw new Error('The extension ID could not be resolved.');
    const sidePanel = await context.newPage();
    await sidePanel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await expect(
      sidePanel.getByRole('heading', { name: 'How would you like to set up AURA?' }),
    ).toBeVisible();
    await sidePanel.getByRole('button', { name: 'Talk with me Answer by voice' }).click();
    await sidePanel.getByRole('button', { name: 'Start recording' }).click();
    await expect(sidePanel.getByText('Microphone active. Recording your answer.')).toBeVisible();
    await sidePanel.getByRole('button', { name: 'Stop and use recording' }).click();
    await expect(
      sidePanel.getByRole('textbox', { name: 'Your answer' }),
    ).toBeVisible();
    await expect(sidePanel.getByRole('textbox', { name: 'Your answer' })).toHaveValue(
      'I would like larger text and clearer controls.',
    );
    await sidePanel.getByRole('button', { name: 'Exit setup' }).click();
    await expect(
      sidePanel.getByRole('heading', { name: 'Your adaptation setup' }),
    ).toBeVisible();

    const page = await context.newPage();
    await page.goto('http://localhost:4173/cluttered-article.html');
    await page.bringToFront();

    await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      await extensionApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/adaptive.js'],
      });
    });
    await expect(page.locator('html')).toHaveAttribute('data-aura-runtime', 'ready');

    const applyProfile = async (profileIndex: number) => {
      const profile = DEMO_PROFILES[profileIndex];
      if (!profile) throw new Error('Demo profile is unavailable.');
      return serviceWorker.evaluate(async (value) => {
        const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi })
          .chrome;
        const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
        if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
        try {
          return await extensionApi.tabs.sendMessage(tab.id, {
            type: 'PAGE_ADAPT',
            profile: value,
          });
        } catch {
          await extensionApi.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/adaptive.js'],
          });
          let lastError: unknown;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            try {
              return await extensionApi.tabs.sendMessage(tab.id, {
                type: 'PAGE_ADAPT',
                profile: value,
              });
            } catch (error) {
              lastError = error;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
            }
          }
          throw lastError;
        }
      }, profile);
    };

    const lowVisionStatus = await applyProfile(0);
    expect(lowVisionStatus).toEqual(
      expect.objectContaining({ adapted: true, appliedKinds: expect.arrayContaining(['improveContrast']) }),
    );
    await expect(page.locator('html')).toHaveAttribute('data-aura-active', 'true');
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(6);

    const attentionStatus = await applyProfile(2);
    expect(attentionStatus).toEqual(
      expect.objectContaining({ adapted: true, appliedKinds: expect.arrayContaining(['focusMainContent']) }),
    );
    await expect(page.locator('aside')).toHaveAttribute('data-aura-secondary', 'collapsed');
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(5);

    const undoStatus = await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_REVERT' });
    });
    expect(undoStatus).toEqual(expect.objectContaining({ adapted: false }));
    await expect(page.locator('html')).not.toHaveAttribute('data-aura-active', 'true');
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(0);
    await expect(page.locator('aside')).not.toHaveAttribute('data-aura-secondary', 'collapsed');
  } finally {
    await context.close();
  }
});
