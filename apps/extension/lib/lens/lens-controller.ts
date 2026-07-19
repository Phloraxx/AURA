import { lensStatusSchema, type FrictionSignal, type LensStatus } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';
import { LensOverlay } from './lens-overlay';

export class LensController {
  readonly #registry: ElementRegistry;
  readonly #overlay: LensOverlay;
  #signals: readonly FrictionSignal[] = [];
  #enabled = false;
  #selectedFrictionId: string | undefined;

  constructor(document: Document, registry: ElementRegistry) {
    this.#registry = registry;
    this.#overlay = new LensOverlay(document, registry);
  }

  setSignals(signals: readonly FrictionSignal[]): void {
    this.#signals = signals;
    this.#overlay.setSignals(signals);
  }

  setEnabled(enabled: boolean): LensStatus {
    this.#enabled = enabled;
    if (enabled) this.#overlay.show();
    else this.#overlay.hide();
    return this.status();
  }

  select(frictionId: string): LensStatus {
    if (this.#signals.some(({ id }) => id === frictionId)) {
      this.#selectedFrictionId = frictionId;
      this.#overlay.setSelected(frictionId);
      const signal = this.#signals.find(({ id }) => id === frictionId);
      const target = signal?.targetIds
        .map((id) => this.#registry.getElement(id))
        .find((element): element is Element => element !== undefined);
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    return this.status();
  }

  status(): LensStatus {
    return lensStatusSchema.parse({
      enabled: this.#enabled,
      ...(this.#selectedFrictionId ? { selectedFrictionId: this.#selectedFrictionId } : {}),
    });
  }

  destroy(): void {
    this.#overlay.destroy();
  }
}
