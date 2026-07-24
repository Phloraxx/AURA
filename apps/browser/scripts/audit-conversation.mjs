/* global URL, process, setTimeout, window */

import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const endpoint = process.env.AURA_CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const outputPath =
  process.env.AURA_CONVERSATION_AUDIT_OUTPUT ??
  '/tmp/aura-conversation-audit.json';
const sites = [
  ['Article/news', 'Wikipedia', 'https://en.wikipedia.org/wiki/Accessibility'],
  ['Form/application', 'W3C Forms', 'https://www.w3.org/WAI/tutorials/forms/'],
  ['E-commerce', 'IKEA Desks', 'https://www.ikea.com/us/en/cat/desks-computer-desks-20649/'],
];

const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const shell = context
  ?.pages()
  .find(
    (page) =>
      page.url().startsWith('file:') ||
      page.url().startsWith('http://localhost:5173'),
  );
if (context === undefined || shell === undefined) {
  throw new Error('The AURA shell page was not found.');
}

async function waitForModel(url, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() =>
      window.aura.getPageIntelligenceState(),
    );
    if (state !== null) {
      try {
        if (new URL(state.model.url).hostname === new URL(url).hostname) {
          return state;
        }
      } catch {
        // Keep polling.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('No current PageModel was published.');
}

const results = [];
for (const [category, name, url] of sites) {
  try {
    await shell.evaluate((address) => window.aura.navigate(address), url);
    const intelligence = await waitForModel(url);
    const adjust = await shell.evaluate(() =>
      window.aura.conversationTurn({
        userMessage: 'The page feels busy and these controls are too small.',
      }),
    );
    const explain = await shell.evaluate(() =>
      window.aura.conversationTurn({
        userMessage: 'Could you explain what this page is for?',
      }),
    );
    const goal = await shell.evaluate(() =>
      window.aura.conversationTurn({
        userMessage: 'Please help me find the main action on this page.',
      }),
    );
    const remember = await shell.evaluate(() =>
      window.aura.conversationTurn({
        userMessage: 'Remember that I prefer brief explanations.',
      }),
    );
    const state = await shell.evaluate(() => window.aura.getConversationState());
    await shell.evaluate(() => window.aura.dismissMemory());

    const expected = [
      [adjust.actionFamily, 'adjust'],
      [explain.actionFamily, 'explain'],
      [goal.actionFamily, 'goal_guide'],
      [remember.actionFamily, 'remember'],
    ];
    if (expected.some(([actual, wanted]) => actual !== wanted)) {
      throw new Error(`Unexpected action families: ${JSON.stringify(expected)}`);
    }
    if (goal.intent === null || state.currentIntent === null) {
      throw new Error('Goal intent was not retained.');
    }
    if (state.pendingMemory === null) {
      throw new Error('Remember did not require explicit confirmation.');
    }
    results.push({
      actions: expected.map(([actual]) => actual),
      category,
      intent: state.currentIntent.goal,
      name,
      pageId: intelligence.model.pageId,
      status: 'PASS',
    });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    results.push({
      category,
      error: error instanceof Error ? error.message : String(error),
      name,
      status: 'FAIL',
      url,
    });
    process.stdout.write(`FAIL ${name}\n`);
  }
}

await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
await browser.close();
const passed = results.filter((result) => result.status === 'PASS').length;
process.stdout.write(
  `Completed ${results.length} sites: ${passed} passed, ${results.length - passed} failed.\n`,
);
if (passed !== results.length) process.exitCode = 1;
