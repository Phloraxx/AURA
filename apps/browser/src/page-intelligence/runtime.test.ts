// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageIntelligenceRuntime } from './runtime';

function mockLayout(): void {
  let nextY = 20;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function getBoundingClientRect() {
      const y = nextY;
      nextY += 45;
      return {
        bottom: y + 36,
        height: 36,
        left: 20,
        right: 420,
        toJSON: () => ({}),
        top: y,
        width: 400,
        x: 20,
        y,
      };
    },
  );
}

describe('page intelligence runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = 'Fixture';
    window.history.replaceState({}, '', '/fixture');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    });
    mockLayout();
  });

  it('models semantics, labels, forms, repetition, and open shadow DOM', () => {
    document.body.innerHTML = `
      <header><nav aria-label="Primary"><ul>
        ${Array.from(
          { length: 6 },
          (_, index) => `<li class="nav-item"><a href="/${index}">Item ${index}</a></li>`,
        ).join('')}
      </ul></nav></header>
      <main>
        <article>
          <h1>Apply for the programme</h1>
          <p>This substantial paragraph explains the application process and the documents a student needs to prepare.</p>
          <form aria-label="Application">
            <label for="email">Email address</label>
            <input id="email" type="email" value="private@example.com">
            <label for="password">Password</label>
            <input id="password" type="password" value="do-not-collect">
            <textarea aria-label="Private note">do-not-collect-textarea</textarea>
            <div contenteditable="true" aria-label="Editable note">do-not-collect-editable</div>
            <button type="submit">Continue</button>
          </form>
        </article>
      </main>
      <div id="shadow-host"></div>
    `;
    const shadowRoot = document
      .querySelector('#shadow-host')
      ?.attachShadow({ mode: 'open' });
    shadowRoot?.append(document.createElement('button'));
    const shadowButton = shadowRoot?.querySelector('button');
    if (shadowButton !== null && shadowButton !== undefined) {
      shadowButton.textContent = 'Shadow action';
    }

    const runtime = createPageIntelligenceRuntime(() => undefined);
    const model = runtime.capture('manual');

    expect(model.schemaVersion).toBe(1);
    expect(model.revision).toBe(1);
    expect(model.elements.some((element) => element.tag === 'main')).toBe(true);
    expect(
      model.elements.some(
        (element) =>
          element.category === 'heading' &&
          element.accessibleName === 'Apply for the programme',
      ),
    ).toBe(true);
    expect(
      model.elements.some(
        (element) => element.accessibleName === 'Shadow action',
      ),
    ).toBe(true);
    expect(model.forms).toEqual([
      expect.objectContaining({
        accessibleName: 'Application',
        labeledControlCount: 5,
        totalControlCount: 5,
      }),
    ]);
    expect(
      model.elements.find((element) => element.inputType === 'password'),
    ).toEqual(
      expect.objectContaining({
        accessibleName: 'Password',
        text: null,
      }),
    );
    expect(JSON.stringify(model)).not.toContain('do-not-collect');
    expect(model.privacy).toEqual({
      hasEditableControl: true,
      hasNonEmptyEditableControl: true,
      hasPasswordControl: true,
    });
    expect(model.repeatedStructures.some((group) => group.count >= 3)).toBe(
      true,
    );
  });

  it('treats empty and plaintext-only contenteditable controls as private editable input', () => {
    document.body.innerHTML = `
      <main>
        <h1>Private editor</h1>
        <div contenteditable aria-label="Draft">private-empty-attribute</div>
        <div contenteditable="plaintext-only" aria-label="Plain draft">private-plaintext</div>
      </main>
    `;
    const runtime = createPageIntelligenceRuntime(() => undefined);
    const model = runtime.capture('manual');

    expect(model.privacy.hasEditableControl).toBe(true);
    expect(model.privacy.hasNonEmptyEditableControl).toBe(true);
    expect(JSON.stringify(model)).not.toContain('private-empty-attribute');
    expect(JSON.stringify(model)).not.toContain('private-plaintext');
  });

  it('keeps target IDs stable within a page session and increments revisions', () => {
    document.body.innerHTML = `
      <main>
        <h1>Stable page</h1>
        <p>This paragraph is long enough to become a meaningful AURA text target for the current page.</p>
        <button>Continue</button>
      </main>
    `;
    const runtime = createPageIntelligenceRuntime(() => undefined);
    const first = runtime.capture('manual');
    const firstHeading = first.elements.find(
      (element) => element.category === 'heading',
    );

    document.querySelector('main')?.append(document.createElement('button'));
    const second = runtime.capture('mutation');
    const secondHeading = second.elements.find(
      (element) => element.category === 'heading',
    );

    expect(second.revision).toBe(first.revision + 1);
    expect(second.pageId).toBe(first.pageId);
    expect(secondHeading?.auraId).toBe(firstHeading?.auraId);
    expect(
      runtime.handleCommand({
        pageId: first.pageId,
        revision: first.revision,
        type: 'capture-now',
      }),
    ).toBe(false);
    expect(first.privacy).toEqual({
      hasEditableControl: false,
      hasNonEmptyEditableControl: false,
      hasPasswordControl: false,
    });
  });
});
