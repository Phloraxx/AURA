// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PresentationSettings } from '../shared/adaptation';
import { createPageAdaptationRuntime } from './runtime';

const comfortableSettings: PresentationSettings = {
  lineSpacing: 1.55,
  readingWidth: 'narrow',
  reduceMotion: true,
  strongFocus: true,
  targetSizePx: 52,
  textScale: 1.15,
};

function installFixture(): void {
  document.documentElement.setAttribute('data-site-root', 'preserve-me');
  document.body.innerHTML = `
    <header><a href="/home">Home</a></header>
    <main class="site-main" style="padding: 12px" data-aura-reading-region="site-owned">
      <article>
        <h1>Apply for the programme</h1>
        <p>${'This is important application information. '.repeat(18)}</p>
        <label for="name">Name</label>
        <input id="name" value="Ada Lovelace">
        <label><input id="consent" type="checkbox" checked> I agree</label>
        <label for="course">Course</label>
        <select id="course">
          <option>Computing</option>
          <option selected>Design</option>
        </select>
        <label for="note">Note</label>
        <textarea id="note">Preserve this draft</textarea>
        <button type="button">Continue</button>
      </article>
    </main>
  `;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function getBoundingClientRect(this: Element) {
      const width = this.matches('main, article') ? 800 : 180;
      return {
        bottom: 600,
        height: 400,
        left: 20,
        right: 20 + width,
        toJSON: () => ({}),
        top: 200,
        width,
        x: 20,
        y: 200,
      };
    },
  );
}

function applyPresentation(
  runtime: ReturnType<typeof createPageAdaptationRuntime>,
  settings = comfortableSettings,
) {
  return runtime.handleCommand({
    pageId: 'page-1',
    revision: 1,
    settings,
    type: 'apply-presentation',
  });
}

describe('page adaptation runtime', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.documentElement.removeAttribute('data-aura-presentation');
    document.documentElement.removeAttribute('data-site-root');
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    installFixture();
  });

  it('applies one page-owned presentation without changing form state', () => {
    const runtime = createPageAdaptationRuntime();

    const result = applyPresentation(runtime);

    expect(result).toEqual(
      expect.objectContaining({
        error: null,
        pageId: 'page-1',
        status: 'applied',
        view: 'aura',
      }),
    );
    expect(document.documentElement.dataset.auraPresentation).toBe('on');
    expect(
      document.querySelectorAll('style[data-aura-presentation-style]'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-aura-reading-region="on"]'),
    ).toHaveLength(1);
    expect((document.querySelector('#name') as HTMLInputElement).value).toBe(
      'Ada Lovelace',
    );
    expect(
      (document.querySelector('#consent') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (document.querySelector('#course') as HTMLSelectElement).selectedIndex,
    ).toBe(1);
    expect(
      (document.querySelector('#note') as HTMLTextAreaElement).value,
    ).toBe('Preserve this draft');
    const css = document.querySelector('style')?.textContent ?? '';
    expect(css).toContain('min-block-size: 52px');
    expect(css).toContain('animation-duration: 0.01ms');
    expect(css).not.toContain('a[href]');
  });

  it('restores exact page-owned attributes and preserves site classes and styles', () => {
    const runtime = createPageAdaptationRuntime();
    const main = document.querySelector('main');

    applyPresentation(runtime);
    const result = runtime.handleCommand({
      pageId: 'page-1',
      type: 'set-adaptation-view',
      view: 'original',
    });

    expect(result.status).toBe('restored');
    expect(document.documentElement.hasAttribute('data-aura-presentation')).toBe(
      false,
    );
    expect(document.documentElement.dataset.siteRoot).toBe('preserve-me');
    expect(main?.getAttribute('data-aura-reading-region')).toBe('site-owned');
    expect(main?.className).toBe('site-main');
    expect(main?.getAttribute('style')).toBe('padding: 12px');
    expect(
      document.querySelector('style[data-aura-presentation-style]'),
    ).toBeNull();
  });

  it('survives five Original/AURA cycles without duplicate styles or drift', () => {
    const runtime = createPageAdaptationRuntime();
    applyPresentation(runtime);

    for (let index = 0; index < 5; index += 1) {
      runtime.handleCommand({
        pageId: 'page-1',
        type: 'set-adaptation-view',
        view: 'original',
      });
      expect(
        document.querySelector('style[data-aura-presentation-style]'),
      ).toBeNull();
      runtime.handleCommand({
        pageId: 'page-1',
        type: 'set-adaptation-view',
        view: 'aura',
      });
      expect(
        document.querySelectorAll('style[data-aura-presentation-style]'),
      ).toHaveLength(1);
    }

    runtime.handleCommand({
      pageId: 'page-1',
      type: 'set-adaptation-view',
      view: 'original',
    });
    expect(document.documentElement.hasAttribute('data-aura-presentation')).toBe(
      false,
    );
    expect(
      document.querySelector('main')?.getAttribute(
        'data-aura-reading-region',
      ),
    ).toBe('site-owned');
    expect((document.querySelector('#name') as HTMLInputElement).value).toBe(
      'Ada Lovelace',
    );
    expect(
      (document.querySelector('#consent') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (document.querySelector('#course') as HTMLSelectElement).selectedIndex,
    ).toBe(1);
    expect(
      (document.querySelector('#note') as HTMLTextAreaElement).value,
    ).toBe('Preserve this draft');
  });

  it('produces measurably different presentations for two profiles', () => {
    const runtime = createPageAdaptationRuntime();
    applyPresentation(runtime, {
      lineSpacing: 1.4,
      readingWidth: 'normal',
      reduceMotion: false,
      strongFocus: true,
      targetSizePx: 44,
      textScale: 1,
    });
    const standardCss = document.querySelector('style')?.textContent ?? '';

    applyPresentation(runtime, {
      lineSpacing: 1.7,
      readingWidth: 'narrow',
      reduceMotion: true,
      strongFocus: true,
      targetSizePx: 60,
      textScale: 1.3,
    });
    const supportedCss = document.querySelector('style')?.textContent ?? '';

    expect(standardCss).toContain('min-block-size: 44px');
    expect(standardCss).not.toContain('animation-duration');
    expect(standardCss).not.toContain('max-inline-size: 72ch');
    expect(supportedCss).toContain('min-block-size: 60px');
    expect(supportedCss).toContain('animation-duration: 0.01ms');
    expect(supportedCss).toContain('max-inline-size: 72ch');
    expect(supportedCss).not.toBe(standardCss);
  });

  it('replaces an active same-page presentation while retaining exact restoration', () => {
    const runtime = createPageAdaptationRuntime();
    applyPresentation(runtime);

    applyPresentation(runtime, {
      ...comfortableSettings,
      lineSpacing: 1.7,
      targetSizePx: 60,
      textScale: 1.3,
    });
    expect(document.querySelector('style')?.textContent).toContain(
      'min-block-size: 60px',
    );

    runtime.handleCommand({
      pageId: 'page-1',
      type: 'set-adaptation-view',
      view: 'original',
    });
    expect(
      document.querySelector('main')?.getAttribute(
        'data-aura-reading-region',
      ),
    ).toBe('site-owned');
    expect(document.documentElement.hasAttribute('data-aura-presentation')).toBe(
      false,
    );
  });

  it('rejects commands for a stale page session', () => {
    const runtime = createPageAdaptationRuntime();
    applyPresentation(runtime);

    expect(
      runtime.handleCommand({
        pageId: 'stale-page',
        type: 'set-adaptation-view',
        view: 'original',
      }),
    ).toEqual(
      expect.objectContaining({
        error: 'The AURA presentation session is no longer current.',
        status: 'failed',
      }),
    );
  });

  it('restores the old page session before accepting a new page', () => {
    const runtime = createPageAdaptationRuntime();
    applyPresentation(runtime);

    runtime.handleCommand({
      pageId: 'page-2',
      revision: 1,
      settings: {
        ...comfortableSettings,
        readingWidth: 'normal',
      },
      type: 'apply-presentation',
    });
    expect(
      document.querySelector('main')?.getAttribute(
        'data-aura-reading-region',
      ),
    ).toBe('site-owned');
    expect(
      runtime.handleCommand({
        pageId: 'page-1',
        type: 'set-adaptation-view',
        view: 'original',
      }).status,
    ).toBe('failed');
  });
});
