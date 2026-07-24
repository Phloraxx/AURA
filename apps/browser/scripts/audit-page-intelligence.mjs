/* global URL, process, setTimeout, window */

import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const endpoint = process.env.AURA_CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const outputPath =
  process.env.AURA_AUDIT_OUTPUT ?? '/tmp/aura-page-intelligence-audit.json';

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

const lateSites = [
  ['Article/news', 'NASA News', 'https://www.nasa.gov/news/all-news/'],
  ['University/college', 'Harvard', 'https://www.harvard.edu/'],
  ['Government/public service', 'Canada Benefits', 'https://www.canada.ca/en/services/benefits.html'],
  ['Documentation/technical', 'Python Tutorial', 'https://docs.python.org/3/tutorial/'],
  ['SPA/dashboard', 'Next.js Docs', 'https://nextjs.org/docs'],
];

const sites =
  process.env.AURA_AUDIT_SET === 'late' ? lateSites : baselineSites;

const browser = await chromium.connectOverCDP(endpoint);
const pages = browser.contexts().flatMap((context) => context.pages());
const shell = pages.find((page) => page.url().startsWith('file:'));

if (shell === undefined) {
  throw new Error('The AURA shell page was not found.');
}

const results = [];

async function waitForPageModel(shell, expectedUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await shell.evaluate(() =>
      window.aura.getPageIntelligenceState(),
    );
    if (state !== null && state.screenshot.status !== 'pending') {
      try {
        if (new URL(state.model.url).hostname === new URL(expectedUrl).hostname) {
          return state;
        }
      } catch {
        // Keep polling until a valid state or the bounded timeout.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No settled PageModel was published within ${timeoutMs} ms.`);
}

for (const [category, name, url] of sites) {
  const startedAt = Date.now();
  try {
    await shell.evaluate(async (address) => {
      await window.aura.navigate(address);
    }, url);
    const state = await waitForPageModel(shell, url);

    const topTargets = state.model.elements.slice(0, 12).map((element) => ({
      category: element.category,
      name: element.accessibleName ?? element.text ?? element.tag,
    }));
    results.push({
      category,
      durationMs: Date.now() - startedAt,
      health: state.model.extractionHealth,
      metrics: state.model.metrics,
      name,
      screenshot: state.screenshot,
      status: 'PASS',
      topTargets,
      url: state.model.url,
    });
    process.stdout.write(`PASS ${name} (${state.model.elements.length} targets)\n`);
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
