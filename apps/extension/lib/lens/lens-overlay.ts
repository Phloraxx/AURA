import type { FrictionSignal } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

const CATEGORY_LABELS: Record<FrictionSignal['category'], string> = {
  readability: 'Hard to read',
  interaction_target: 'Small target',
  focus_navigation: 'Difficult keyboard path',
  attention_clutter: 'Competing regions',
  cognitive_workflow: 'Complex workflow',
  language_complexity: 'Complex wording',
  motion: 'Motion may distract',
  control_clarity: 'Unclear control',
  form_complexity: 'Long or complex form',
};

export class LensOverlay {
  readonly #document: Document;
  readonly #registry: ElementRegistry;
  readonly #root: HTMLDivElement;
  #signals: readonly FrictionSignal[] = [];
  #selectedId: string | undefined;
  #updateTimer: ReturnType<typeof setTimeout> | undefined;
  #destroyed = false;

  constructor(document: Document, registry: ElementRegistry) {
    this.#document = document;
    this.#registry = registry;
    this.#root = document.createElement('div');
    this.#root.dataset.auraOwned = 'true';
    this.#root.dataset.auraLensRoot = 'true';
    this.#root.setAttribute('aria-hidden', 'true');
    this.#root.style.position = 'fixed';
    this.#root.style.inset = '0';
    this.#root.style.zIndex = '2147483646';
    this.#root.style.pointerEvents = 'none';
    this.#root.style.fontFamily = 'system-ui, sans-serif';

    const view = document.defaultView;
    view?.addEventListener('scroll', this.#scheduleUpdate, { passive: true });
    view?.addEventListener('resize', this.#scheduleUpdate, { passive: true });
  }

  setSignals(signals: readonly FrictionSignal[]): void {
    this.#signals = signals;
    if (this.#selectedId && !signals.some(({ id }) => id === this.#selectedId)) {
      this.#selectedId = undefined;
    }
    this.#render();
  }

  setSelected(frictionId: string | undefined): void {
    this.#selectedId = frictionId;
    this.#render();
  }

  show(): void {
    if (this.#destroyed) return;
    if (!this.#root.isConnected) {
      (this.#document.body ?? this.#document.documentElement).append(this.#root);
    }
    this.#render();
  }

  hide(): void {
    this.#root.remove();
  }

  destroy(): void {
    this.#destroyed = true;
    this.hide();
    if (this.#updateTimer) clearTimeout(this.#updateTimer);
    const view = this.#document.defaultView;
    view?.removeEventListener('scroll', this.#scheduleUpdate);
    view?.removeEventListener('resize', this.#scheduleUpdate);
  }

  #scheduleUpdate = (): void => {
    if (this.#destroyed || !this.#root.isConnected || this.#updateTimer) return;
    this.#updateTimer = setTimeout(() => {
      this.#updateTimer = undefined;
      this.#render();
    }, 50);
  };

  #render(): void {
    if (this.#destroyed || !this.#root.isConnected) return;
    this.#root.replaceChildren();
    const fragment = this.#document.createDocumentFragment();
    this.#signals.forEach((signal, index) => {
      const target = signal.targetIds
        .map((id) => this.#registry.getElement(id))
        .find((element): element is Element => element !== undefined);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const selected = signal.id === this.#selectedId;
      const box = this.#document.createElement('div');
      box.dataset.auraLensMarker = signal.id;
      box.style.position = 'absolute';
      box.style.left = `${rect.left}px`;
      box.style.top = `${rect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      box.style.boxSizing = 'border-box';
      box.style.border = selected ? '3px solid #f59e0b' : '2px solid #0f766e';
      box.style.borderRadius = '6px';
      box.style.background = selected ? 'rgb(245 158 11 / 0.12)' : 'rgb(15 118 110 / 0.08)';

      const marker = this.#document.createElement('span');
      marker.textContent = String(index + 1);
      marker.style.position = 'absolute';
      marker.style.left = '-2px';
      marker.style.top = '-2px';
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.display = 'grid';
      marker.style.placeItems = 'center';
      marker.style.width = '24px';
      marker.style.height = '24px';
      marker.style.borderRadius = '50%';
      marker.style.color = '#fff';
      marker.style.background = selected ? '#b45309' : '#0f766e';
      marker.style.font = '700 13px/1 system-ui, sans-serif';
      marker.title = CATEGORY_LABELS[signal.category];
      box.append(marker);
      fragment.append(box);
    });
    this.#root.append(fragment);
  }
}
