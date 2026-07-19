import { chromium, expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

interface ExtensionApi {
  tabs: {
    query(options: { url?: string }): Promise<Array<{ id?: number }>>;
  };
  scripting: {
    executeScript(options: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
}

async function clickButtonWithoutActivating(panel: Page, name: string): Promise<void> {
  const button = panel.getByRole('button', { name, exact: true });
  await expect(button).toBeVisible();
  await button.evaluate((element) => (element as HTMLButtonElement).click());
}

async function clickControlWithoutActivating(panel: Page, label: string): Promise<void> {
  const control = panel.getByLabel(label, { exact: true });
  await expect(control).toBeVisible();
  await control.evaluate((element) => (element as HTMLElement).click());
}

async function injectRuntime(serviceWorker: Page, fixtureUrl: string): Promise<void> {
  await serviceWorker.evaluate(async (url) => {
    const extensionApi = (globalThis as typeof globalThis & { chrome: ExtensionApi }).chrome;
    const [tab] = await extensionApi.tabs.query({ url });
    if (tab?.id === undefined) throw new Error('Fixture tab is unavailable.');
    await extensionApi.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-scripts/adaptive.js'],
    });
  }, fixtureUrl);
}

test('runs the complete SEE → TRANSFORM → GUIDE → RESCUE judge path through the side panel', async () => {
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

    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await expect(
      panel.getByRole('heading', { name: 'How would you like to set up AURA?' }),
    ).toBeVisible();
    await clickButtonWithoutActivating(panel, 'Return to profiles');
    await expect(panel.getByRole('heading', { name: 'Your adaptation setup' })).toBeVisible();

    const page = await context.newPage();
    const fixtureUrl = 'http://localhost:4173/cluttered-article.html';
    await page.goto(fixtureUrl);
    await page.bringToFront();
    await injectRuntime(serviceWorker, 'http://localhost:4173/*');
    await expect(page.locator('html')).toHaveAttribute('data-aura-runtime', 'ready');

    // SEE: the real side-panel UI scans the active page and visualizes personalized friction.
    await clickButtonWithoutActivating(panel, 'Page');
    await clickButtonWithoutActivating(panel, 'Scan this page');
    await expect(panel.getByText('AURA Fit', { exact: true }).first()).toBeVisible();
    await expect(panel.locator('.fit-score strong')).toHaveText(/\d+/u);
    await clickButtonWithoutActivating(panel, 'Show friction');
    await expect(page.locator('[data-aura-lens-root]')).toBeVisible();
    await expect(panel.locator('.friction-item')).not.toHaveCount(0);
    await clickButtonWithoutActivating(panel, 'Hide friction');
    await expect(page.locator('[data-aura-lens-root]')).toHaveCount(0);

    // TRANSFORM: adaptation happens through the real button, then compare uses reversible primitives.
    await clickButtonWithoutActivating(panel, 'Adapt this page');
    await expect(panel.getByRole('heading', { name: 'Your page, reshaped' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('html')).toHaveAttribute('data-aura-active', 'true');
    await expect(panel.locator('.fit-delta')).toContainText('Before');
    await expect(panel.locator('.fit-delta')).toContainText('AURA');

    const decisionSummary = panel.locator('summary').filter({ hasText: 'Why these changes?' });
    await decisionSummary.evaluate((element) => (element as HTMLElement).click());
    await expect(panel.locator('.decision-card').first()).toBeVisible();

    await clickControlWithoutActivating(panel, 'Original');
    await expect(page.locator('html')).not.toHaveAttribute('data-aura-active', 'true');
    await clickControlWithoutActivating(panel, 'AURA');
    await expect(page.locator('html')).toHaveAttribute('data-aura-active', 'true');

    // GUIDE: task planning and navigation are exercised from the actual side-panel controls.
    await clickButtonWithoutActivating(panel, 'Task');
    await clickButtonWithoutActivating(panel, 'Find the main action');
    await expect(panel.getByText('Task detected', { exact: true })).toBeVisible({ timeout: 10_000 });
    await clickButtonWithoutActivating(panel, 'Start guided mode');
    await expect(page.locator('[data-aura-task-target="true"]').first()).toBeVisible();
    await clickButtonWithoutActivating(panel, 'Stop guided mode');
    await expect(page.locator('[data-aura-task-target="true"]')).toHaveCount(0);

    // Return to a clean baseline, rescan to reactivate local Rescue monitoring, then trigger a real near miss.
    await clickButtonWithoutActivating(panel, 'Page');
    await clickButtonWithoutActivating(panel, 'Undo all');
    await expect(page.locator('html')).not.toHaveAttribute('data-aura-active', 'true');
    await clickButtonWithoutActivating(panel, 'Rescan page');

    await page.bringToFront();
    const rescueTarget = page.locator('#rescue-demo-target');
    const box = await rescueTarget.boundingBox();
    if (!box) throw new Error('Rescue demo target is not visible.');
    const nearX = box.x + box.width + 8;
    const nearY = box.y + box.height / 2;
    await page.mouse.click(nearX, nearY);
    await page.waitForTimeout(150);
    await page.mouse.click(nearX, nearY);

    await expect(
      panel.getByRole('heading', { name: 'Having trouble selecting this control?' }),
    ).toBeVisible({ timeout: 5_000 });
    await clickButtonWithoutActivating(panel, 'Try this');
    await expect(page.locator('html')).toHaveAttribute('data-aura-active', 'true', {
      timeout: 15_000,
    });
    const enlarged = await rescueTarget.boundingBox();
    expect(enlarged?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(enlarged?.height ?? 0).toBeGreaterThanOrEqual(44);

    await clickButtonWithoutActivating(panel, 'Undo all');
    await expect(page.locator('html')).not.toHaveAttribute('data-aura-active', 'true');
  } finally {
    await context.close();
  }
});
