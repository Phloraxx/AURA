/* global document, HTMLInputElement, HTMLSelectElement, URL, process, setTimeout, window */

import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const endpoint = process.env.AURA_CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const outputPath =
  process.env.AURA_ADAPTATION_AUDIT_OUTPUT ??
  '/tmp/aura-adaptation-audit.json';

const baselineSites = [
  ['Article/news', 'Wikipedia', 'https://en.wikipedia.org/wiki/Accessibility'],
  ['Article/news', 'BBC', 'https://www.bbc.com/news'],
  ['Article/news', 'The Guardian', 'https://www.theguardian.com/international'],
  ['Article/news', 'NPR', 'https://www.npr.org/'],
  ['E-commerce', 'Apple Store', 'https://www.apple.com/shop/buy-mac'],
  ['E-commerce', 'eBay', 'https://www.ebay.com/sch/i.html?_nkw=laptop'],
  ['E-commerce', 'IKEA', 'https://www.ikea.com/us/en/cat/desks-computer-desks-20649/'],
  ['University/college', 'MIT', 'https://www.mit.edu/'],
  ['University/college', 'Stanford', 'https://www.stanford.edu/'],
  ['University/college', 'Sahrdaya', 'https://sahrdaya.ac.in/'],
  ['Government/public service', 'GOV.UK', 'https://www.gov.uk/apply-renew-passport'],
  ['Government/public service', 'USA.gov', 'https://www.usa.gov/passport'],
  ['Government/public service', 'India.gov.in', 'https://www.india.gov.in/'],
  ['Documentation/technical', 'Electron', 'https://www.electronjs.org/docs/latest/api/web-contents'],
  ['Documentation/technical', 'React', 'https://react.dev/learn'],
  ['Documentation/technical', 'TypeScript', 'https://www.typescriptlang.org/docs/'],
  ['Form/application', 'W3C Forms', 'https://www.w3.org/WAI/tutorials/forms/'],
  ['Form/application', 'GOV.UK Form', 'https://www.gov.uk/contact/govuk'],
  ['SPA/dashboard', 'GitHub', 'https://github.com/electron/electron'],
  ['Search/listing', 'MDN Search', 'https://developer.mozilla.org/en-US/search?q=accessibility'],
];
const finalSites = [
  ['Nonprofit/public information', 'UNICEF', 'https://www.unicef.org/'],
  ['Technology/public information', 'Mozilla', 'https://www.mozilla.org/en-US/'],
];
const sites =
  process.env.AURA_AUDIT_SET === 'final' ? finalSites : baselineSites;

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
  throw new Error('Complete Learn Me before running the adaptation audit.');
}

async function waitForPageModel(expectedUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let stableKey = null;
  let stableSince = 0;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() =>
      window.aura.getPageIntelligenceState(),
    );
    if (state !== null && state.screenshot.status !== 'pending') {
      try {
        if (new URL(state.model.url).hostname === new URL(expectedUrl).hostname) {
          const key = `${state.model.pageId}:${state.model.url}`;
          if (key !== stableKey) {
            stableKey = key;
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= 1_200) {
            return state;
          }
        }
      } catch {
        // Keep polling for a current valid state.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No settled PageModel was published within ${timeoutMs} ms.`);
}

async function waitForAdaptation(pageId, expectedView, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() => window.aura.getAdaptationState());
    if (
      state.pageId === pageId &&
      state.status === 'ready' &&
      state.view === expectedView
    ) {
      return state;
    }
    if (state.error !== null) throw new Error(state.error);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `AURA did not reach the ${expectedView} view within ${timeoutMs} ms.`,
  );
}

function findRemotePage(expectedUrl) {
  const expectedHost = new URL(expectedUrl).hostname;
  return context.pages().find((page) => {
    if (page === shell) return false;
    try {
      return new URL(page.url()).hostname === expectedHost;
    } catch {
      return false;
    }
  });
}

async function snapshotPage(page) {
  return page.evaluate(() => {
    const controls = [
      ...document.querySelectorAll('input, select, textarea'),
    ].flatMap((element) => {
      const auraId = element.getAttribute('data-aura-id');
      if (auraId === null) return [];
      if (element instanceof HTMLSelectElement) {
        return [{
          auraId,
          checked: null,
          selectedIndex: element.selectedIndex,
          tag: 'select',
          type: null,
          valueLength: element.value.length,
        }];
      }
      return [{
        auraId,
        checked:
          element instanceof HTMLInputElement ? element.checked : null,
        selectedIndex: null,
        tag: element.tagName.toLowerCase(),
        type:
          element instanceof HTMLInputElement ? element.type : null,
        valueLength: element.value.length,
      }];
    });
    const primary = document.querySelector(
      'main, [role="main"], article, form',
    );
    const readingAttributes = [
      ...document.querySelectorAll('[data-aura-reading-region]'),
    ].map((element) => element.getAttribute('data-aura-reading-region'));
    return {
      auraRoot: document.documentElement.getAttribute(
        'data-aura-presentation',
      ),
      controls,
      primaryTextLength: primary?.textContent?.trim().length ?? 0,
      readingAttributes,
      styleCount: document.querySelectorAll(
        'style[data-aura-presentation-style]',
      ).length,
      title: document.title,
    };
  });
}

function stableControlStateChanged(before, after) {
  const beforeById = new Map(
    before.controls.map((control) => [control.auraId, control]),
  );
  return after.controls.some((control) => {
    const previous = beforeById.get(control.auraId);
    return (
      previous !== undefined &&
      JSON.stringify(previous) !== JSON.stringify(control)
    );
  });
}

const results = [];

async function auditSite(url) {
  await shell.evaluate((address) => window.aura.navigate(address), url);
  let intelligence = await waitForPageModel(url);
  const remote = findRemotePage(url);
  if (remote === undefined) throw new Error('Remote page target not found.');
  const before = await snapshotPage(remote);

  let accepted = false;
  for (let attempt = 0; attempt < 4 && !accepted; attempt += 1) {
    accepted = await shell.evaluate(
      (savedProfile) => window.aura.applyPresentation(savedProfile),
      profile,
    );
    if (!accepted) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      intelligence = await waitForPageModel(url);
    }
  }
  if (!accepted) throw new Error('Main rejected the presentation request.');
  const appliedState = await waitForAdaptation(
    intelligence.model.pageId,
    'aura',
  );
  const adapted = await snapshotPage(remote);

  const restoredRequest = await shell.evaluate(() =>
    window.aura.setAdaptationView('original'),
  );
  if (!restoredRequest) {
    throw new Error('The document changed before Original view was requested.');
  }
  await waitForAdaptation(intelligence.model.pageId, 'original');
  const restored = await snapshotPage(remote);

  const issues = [];
  if (adapted.auraRoot !== 'on' || adapted.styleCount !== 1) {
    issues.push('AURA presentation markers were not applied exactly once.');
  }
  if (stableControlStateChanged(before, adapted)) {
    issues.push('A form-control state changed while applying AURA.');
  }
  if (stableControlStateChanged(before, restored)) {
    issues.push('A form-control state changed after restoration.');
  }
  if (
    before.auraRoot !== restored.auraRoot ||
    before.styleCount !== restored.styleCount ||
    JSON.stringify(before.readingAttributes) !==
      JSON.stringify(restored.readingAttributes)
  ) {
    issues.push('AURA-owned markers did not restore exactly.');
  }
  if (before.primaryTextLength > 0 && restored.primaryTextLength === 0) {
    issues.push('Primary content disappeared after restoration.');
  }
  return {
    changedTargetCount: appliedState.changedTargetCount,
    issues,
    url: intelligence.model.url,
  };
}

for (const [category, name, url] of sites) {
  const startedAt = Date.now();
  let lastError = null;
  let completed = null;
  let attempts = 0;
  for (attempts = 1; attempts <= 2 && completed === null; attempts += 1) {
    try {
      completed = await auditSite(url);
    } catch (error) {
      lastError = error;
    }
  }
  if (completed === null) {
    results.push({
      attempts: 2,
      category,
      durationMs: Date.now() - startedAt,
      error:
        lastError instanceof Error ? lastError.message : String(lastError),
      name,
      status: 'FAIL',
      url,
    });
    process.stdout.write(`FAIL ${name}\n`);
  } else {
    results.push({
      attempts: attempts - 1,
      category,
      changedTargetCount: completed.changedTargetCount,
      durationMs: Date.now() - startedAt,
      issues: completed.issues,
      name,
      status: completed.issues.length === 0 ? 'PASS' : 'FAIL',
      url: completed.url,
    });
    process.stdout.write(
      `${completed.issues.length === 0 ? 'PASS' : 'FAIL'} ${name} (${completed.changedTargetCount} targets)\n`,
    );
  }
}

await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
await browser.close();

const passed = results.filter((result) => result.status === 'PASS').length;
process.stdout.write(
  `Completed ${results.length} sites: ${passed} passed, ${results.length - passed} failed.\n`,
);
if (passed !== results.length) process.exitCode = 1;
