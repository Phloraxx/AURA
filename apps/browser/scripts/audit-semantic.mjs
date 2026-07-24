/* global document, URL, process, setTimeout, window */

import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const endpoint = process.env.AURA_CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const outputPath =
  process.env.AURA_SEMANTIC_AUDIT_OUTPUT ??
  '/tmp/aura-semantic-audit.json';
const sites = [
  ['Article/news', 'NASA News', 'https://www.nasa.gov/news/all-news/'],
  ['University/college', 'Harvard', 'https://www.harvard.edu/'],
  ['Government/public service', 'Canada Benefits', 'https://www.canada.ca/en/services/benefits.html'],
  ['Documentation/technical', 'Python Tutorial', 'https://docs.python.org/3/tutorial/'],
  ['SPA/dashboard', 'Next.js Docs', 'https://nextjs.org/docs'],
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
const profile = await shell.evaluate(() => window.aura.getProfile());
if (profile?.completedAt == null) {
  throw new Error('Complete Learn Me before running the semantic audit.');
}

async function waitForModel(url, timeoutMs = 35_000) {
  const deadline = Date.now() + timeoutMs;
  let stableKey = null;
  let stableSince = 0;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() =>
      window.aura.getPageIntelligenceState(),
    );
    if (state !== null && state.screenshot.status !== 'pending') {
      try {
        if (new URL(state.model.url).hostname === new URL(url).hostname) {
          const key = `${state.model.pageId}:${state.model.url}`;
          if (key !== stableKey) {
            stableKey = key;
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= 1_200) {
            return state;
          }
        }
      } catch {
        // Keep polling.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('No stable PageModel was published.');
}

async function waitForSemantic(pageId, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() =>
      window.aura.getSemanticAnalysisState(),
    );
    if (
      state.pageId === pageId &&
      (state.status === 'ready' || state.status === 'fallback')
    ) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Semantic analysis did not settle.');
}

async function waitForOriginal(pageId, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() => window.aura.getAdaptationState());
    if (
      state.pageId === pageId &&
      state.status === 'ready' &&
      state.view === 'original'
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Original view did not settle.');
}

function findRemote(url) {
  const host = new URL(url).hostname;
  return context.pages().find((page) => {
    if (page === shell) return false;
    try {
      return new URL(page.url()).hostname === host;
    } catch {
      return false;
    }
  });
}

const results = [];
for (const [category, name, url] of sites) {
  const startedAt = Date.now();
  try {
    await shell.evaluate((address) => window.aura.navigate(address), url);
    const intelligence = await waitForModel(url);
    const remote = findRemote(url);
    if (remote === undefined) throw new Error('Remote page target not found.');
    const accepted = await shell.evaluate(
      (savedProfile) => window.aura.applyPresentation(savedProfile),
      profile,
    );
    if (!accepted) throw new Error('Make This Mine was not accepted.');
    const semantic = await waitForSemantic(intelligence.model.pageId);
    if (semantic.status !== 'ready' || semantic.source !== 'ai') {
      throw new Error(semantic.error ?? 'Luna semantic analysis fell back.');
    }
    const applied = await remote.evaluate(() => ({
      collapseCount: document.querySelectorAll(
        '[data-aura-collapsed="on"]',
      ).length,
      ownedCount: document.querySelectorAll('[data-aura-owned]').length,
      primaryCount: document.querySelectorAll('[data-aura-primary="on"]')
        .length,
      rootActive:
        document.documentElement.getAttribute('data-aura-presentation') ===
        'on',
      summaryCount: document.querySelectorAll(
        '[data-aura-owned="summary"]',
      ).length,
    }));
    if (!applied.rootActive || applied.summaryCount !== 1) {
      throw new Error('Validated semantic presentation was not applied.');
    }

    const restored = await shell.evaluate(() =>
      window.aura.setAdaptationView('original'),
    );
    if (!restored) throw new Error('Original view was rejected.');
    await waitForOriginal(intelligence.model.pageId);
    const residue = await remote.evaluate(() => ({
      adaptationAttributes: document.querySelectorAll(
        '[data-aura-primary], [data-aura-secondary], [data-aura-highlight], [data-aura-collapsed]',
      ).length,
      ownedCount: document.querySelectorAll('[data-aura-owned]').length,
      semanticStyles: document.querySelectorAll('[data-aura-semantic-style]')
        .length,
    }));
    if (
      residue.adaptationAttributes !== 0 ||
      residue.ownedCount !== 0 ||
      residue.semanticStyles !== 0
    ) {
      throw new Error('Semantic adaptation left residue after Original.');
    }
    results.push({
      applied,
      category,
      durationMs: Date.now() - startedAt,
      modelDurationMs: semantic.durationMs,
      name,
      status: 'PASS',
      usage: semantic.usage,
      url: intelligence.model.url,
    });
    process.stdout.write(
      `PASS ${name} (${semantic.durationMs} ms, ${semantic.usage?.totalTokens ?? 0} tokens)\n`,
    );
  } catch (error) {
    results.push({
      category,
      durationMs: Date.now() - startedAt,
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
