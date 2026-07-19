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

test('loads the MV3 extension, switches capability-driven profiles, and undoes without reload', async () => {
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
    const voiceAnswer = sidePanel.getByRole('textbox', { name: 'Your answer' });
    const transcriptionError = sidePanel.getByText('AURA could not transcribe that recording. Try again or type instead.');
    await expect(voiceAnswer.or(transcriptionError)).toBeVisible();
    if (await transcriptionError.isVisible()) {
      await sidePanel.getByRole('button', { name: 'Type my answer' }).click();
      await expect(voiceAnswer).toBeVisible();
      await voiceAnswer.fill('I would like larger text and clearer controls.');
    }
    await expect(voiceAnswer).toHaveValue('I would like larger text and clearer controls.');
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

    const initialScan = await serviceWorker.evaluate(async (profile) => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_SCAN', profile });
    }, DEMO_PROFILES[2]);
    expect(initialScan).toEqual(expect.objectContaining({ fit: expect.objectContaining({ isHeuristic: true }) }));
    const alternateScan = await serviceWorker.evaluate(async (profile) => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_SCAN', profile });
    }, DEMO_PROFILES[0]);
    expect((alternateScan as { fit: { score: number } }).fit.score).not.toBe(
      (initialScan as { fit: { score: number } }).fit.score,
    );
    const localSignal = (initialScan as { localSignals?: Array<{ targetIds: string[] }> }).localSignals?.find(({ targetIds }) => targetIds.length > 0);
    if (localSignal) {
      const lensStatus = await serviceWorker.evaluate(async ({ signals }) => {
        const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
        const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
        if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
        return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_LENS_SET', enabled: true, signals });
      }, { signals: [localSignal] });
      expect(lensStatus).toEqual(expect.objectContaining({ enabled: true }));
      await expect(page.locator('[data-aura-lens-root]')).toBeVisible();
      await serviceWorker.evaluate(async () => {
        const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
        const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
        if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
        await extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_LENS_SET', enabled: false, signals: [] });
      });
      await expect(page.locator('[data-aura-lens-root]')).toHaveCount(0);
    }

    const snapshot = await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_SNAPSHOT_GET' });
    });
    const mainId = (snapshot as { elements?: Array<{ id: string; kind: string }> }).elements?.find(({ kind }) => kind === 'landmark')?.id;
    if (!mainId) throw new Error('Fixture main landmark was not registered.');
    const taskStatus = await serviceWorker.evaluate(async ({ mainId }) => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, {
        type: 'PAGE_TASK_APPLY',
        plan: {
          version: 1,
          task: { id: 'task:read_content', label: 'Read this page', rawUserGoal: 'Read this page', kind: 'read_content' },
          steps: [{ id: 'task-step:main', label: 'Review the main content', targetIds: [mainId], optional: false, critical: false }],
          warnings: ['AURA highlights controls but does not activate them.'],
        },
      });
    }, { mainId });
    expect(taskStatus).toEqual(expect.objectContaining({ active: true, targetIds: [mainId] }));
    await expect(page.locator(`[data-aura-task-target="true"]`)).toHaveCount(1);
    await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Active fixture tab is unavailable.');
      await extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_TASK_REVERT' });
    });

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
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(5);

    const attentionStatus = await applyProfile(2);
    expect(attentionStatus).toEqual(
      expect.objectContaining({ adapted: true, appliedKinds: expect.arrayContaining(['focusMainContent']) }),
    );
    await expect(page.locator('aside')).toHaveAttribute('data-aura-secondary', 'collapsed');
    await expect(page.locator('style[data-aura-owned]')).toHaveCount(3);

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
