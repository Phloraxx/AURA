import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

interface ExtensionApi {
  tabs: {
    query(options: { url?: string }): Promise<Array<{ id?: number }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  scripting: {
    executeScript(options: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
}

interface SnapshotElement {
  id: string;
  tag: string;
}

interface PageSnapshot {
  elements: SnapshotElement[];
}

function isPageSnapshot(value: unknown): value is PageSnapshot {
  if (!value || typeof value !== 'object') return false;
  const elements = (value as { elements?: unknown }).elements;
  return Array.isArray(elements) && elements.every((element) => {
    if (!element || typeof element !== 'object') return false;
    const candidate = element as { id?: unknown; tag?: unknown };
    return typeof candidate.id === 'string' && typeof candidate.tag === 'string';
  });
}

test('keeps primary article content visible and restore controls compact', async () => {
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
    });

    const snapshot = await serviceWorker.evaluate(async () => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, { type: 'PAGE_SNAPSHOT_GET' });
    });
    if (!isPageSnapshot(snapshot)) throw new Error('AURA returned an invalid page snapshot.');

    const targetIds = snapshot.elements
      .filter(({ tag }) => ['main', 'article', 'aside'].includes(tag.toLowerCase()))
      .map(({ id }) => id);
    expect(targetIds.length).toBeGreaterThanOrEqual(3);

    await serviceWorker.evaluate(async (ids) => {
      const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
      const [tab] = await extensionApi.tabs.query({ url: 'http://localhost:4173/*' });
      if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
      return extensionApi.tabs.sendMessage(tab.id, {
        type: 'PAGE_SEMANTIC_APPLY',
        plan: {
          version: 1,
          instructions: [{
            id: 'semantic:collapse-distractions',
            kind: 'collapseDistractions',
            source: 'semantic_ai',
            targetIds: ids,
            reason: 'Regression test for semantic distraction safety.',
          }],
        },
      });
    }, targetIds);

    await expect(page.locator('main')).not.toHaveAttribute('data-aura-distraction', 'collapsed');
    await expect(page.locator('article')).not.toHaveAttribute('data-aura-distraction', 'collapsed');
    await expect(page.locator('aside')).toHaveAttribute('data-aura-distraction', 'collapsed');

    const control = page.locator('[data-aura-distraction-control]');
    await expect(control).toHaveCount(1);
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(100);

    await control.click();
    await expect(page.locator('aside')).toHaveAttribute('data-aura-distraction', 'shown');
    await expect(control).toHaveText('Hide secondary content');
  } finally {
    await context.close();
  }
});
