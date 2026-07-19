import { taskStatusSchema, type TaskPlan, type TaskStatus } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

export class TaskNavigator {
  readonly #document: Document;
  readonly #registry: ElementRegistry;
  readonly #style: HTMLStyleElement;
  #plan: TaskPlan | undefined;
  #stepId: string | undefined;
  readonly #originalAttributes = new Map<Element, string | null>();

  constructor(document: Document, registry: ElementRegistry) {
    this.#document = document;
    this.#registry = registry;
    this.#style = document.createElement('style');
    this.#style.dataset.auraOwned = 'true';
    this.#style.dataset.auraTaskStyle = 'true';
    this.#style.textContent = `
      [data-aura-task-target="true"] {
        position: relative !important;
        outline: 4px solid #7c3aed !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 2px #fff, 0 0 0 7px #7c3aed !important;
      }
    `;
  }

  apply(plan: TaskPlan): TaskStatus {
    for (const step of plan.steps) {
      for (const id of step.targetIds) {
        if (!this.#registry.has(id)) throw new Error('Task plan referenced an unavailable page element.');
      }
    }
    this.revert();
    this.#plan = plan;
    this.#stepId = plan.steps[0]?.id;
    this.#sync();
    return this.status();
  }

  setStep(stepId: string): TaskStatus {
    if (this.#plan?.steps.some(({ id }) => id === stepId)) {
      this.#stepId = stepId;
      this.#sync();
    }
    return this.status();
  }

  revert(): void {
    for (const [element, original] of this.#originalAttributes) {
      if (original === null) element.removeAttribute('data-aura-task-target');
      else element.setAttribute('data-aura-task-target', original);
    }
    this.#originalAttributes.clear();
    this.#style.remove();
    this.#plan = undefined;
    this.#stepId = undefined;
  }

  status(): TaskStatus {
    const step = this.#plan?.steps.find(({ id }) => id === this.#stepId);
    return taskStatusSchema.parse({
      active: this.#plan !== undefined,
      ...(this.#stepId ? { stepId: this.#stepId } : {}),
      targetIds: step?.targetIds ?? [],
    });
  }

  #sync(): void {
    if (!this.#plan || !this.#stepId) return;
    if (!this.#style.isConnected) (this.#document.head ?? this.#document.documentElement).append(this.#style);
    for (const [element, original] of this.#originalAttributes) {
      if (original === null) element.removeAttribute('data-aura-task-target');
      else element.setAttribute('data-aura-task-target', original);
    }
    this.#originalAttributes.clear();
    const step = this.#plan.steps.find(({ id }) => id === this.#stepId);
    if (!step) return;
    for (const id of step.targetIds) {
      const element = this.#registry.getElement(id);
      if (!element) continue;
      this.#originalAttributes.set(element, element.getAttribute('data-aura-task-target'));
      element.setAttribute('data-aura-task-target', 'true');
    }
    const first = step.targetIds
      .map((id) => this.#registry.getElement(id))
      .find((element): element is Element => element !== undefined);
    first?.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
}
