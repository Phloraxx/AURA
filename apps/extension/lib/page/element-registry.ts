const SEMANTIC_SELECTOR = [
  'main',
  'article',
  'nav',
  'aside',
  'section',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'button',
  'input:not([type="hidden"]):not([type="password"])',
  'select',
  'textarea',
  '[role]',
].join(',');

export class ElementRegistry {
  readonly #elementIds = new WeakMap<Element, string>();
  readonly #elements = new Map<string, Element>();
  #nextId = 1;

  register(element: Element): string {
    const existing = this.#elementIds.get(element);
    if (existing) return existing;

    const id = `aura:n${this.#nextId}`;
    this.#nextId += 1;
    this.#elementIds.set(element, id);
    this.#elements.set(id, element);
    return id;
  }

  registerSubtree(root: ParentNode): void {
    if (root instanceof Element && root.matches(SEMANTIC_SELECTOR)) {
      this.register(root);
    }
    root.querySelectorAll(SEMANTIC_SELECTOR).forEach((element) => {
      this.register(element);
    });
  }

  getId(element: Element): string | undefined {
    return this.#elementIds.get(element);
  }

  getElement(id: string): Element | undefined {
    const element = this.#elements.get(id);
    if (element && !element.isConnected) {
      this.#elements.delete(id);
      return undefined;
    }
    return element;
  }

  has(id: string): boolean {
    return this.getElement(id) !== undefined;
  }

  prune(): void {
    for (const [id, element] of this.#elements) {
      if (!element.isConnected) this.#elements.delete(id);
    }
  }
}
