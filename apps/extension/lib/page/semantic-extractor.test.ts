// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from './element-registry';
import { extractPageRepresentation } from './semantic-extractor';

describe('compact semantic page extraction', () => {
  it('extracts useful roles while omitting secrets and bounding content', () => {
    document.documentElement.lang = 'en';
    document.title = 'Cluttered article';
    document.body.innerHTML = `
      <nav><a href="/home">Home</a></nav>
      <main><h1>Useful guide</h1><p>${'Readable content '.repeat(80)}</p>
        <label for="email">Email address</label><input id="email" value="secret@example.test">
        <input type="password" value="never-send-this">
        <button>Continue</button>
      </main>
      <aside>Related recommendations</aside>`;

    const page = extractPageRepresentation(document, new ElementRegistry());

    expect(page.title).toBe('Cluttered article');
    expect(page.elements.some(({ kind }) => kind === 'landmark')).toBe(true);
    expect(page.elements.some(({ accessibleName }) => accessibleName === 'Email address')).toBe(
      true,
    );
    expect(JSON.stringify(page)).not.toContain('secret@example.test');
    expect(JSON.stringify(page)).not.toContain('never-send-this');
    expect(Math.max(...page.elements.map(({ text }) => text?.length ?? 0))).toBeLessThanOrEqual(
      400,
    );
  });

  it('caps the element count and reports truncation', () => {
    document.body.innerHTML = Array.from(
      { length: 140 },
      (_, index) => `<p>Paragraph ${index}</p>`,
    ).join('');

    const page = extractPageRepresentation(document, new ElementRegistry());

    expect(page.elements).toHaveLength(80);
    expect(page.truncated).toBe(true);
  });
});
