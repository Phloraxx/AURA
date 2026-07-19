import {
  adaptationPlanSchema,
  type AdaptationKind,
  type AdaptationPlan,
  type PageStatus,
} from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';
import {
  deterministicPrimitiveFactories,
  semanticPrimitiveFactories,
  type AdaptationPrimitive,
  type PrimitiveContext,
} from './primitives/primitives';
import { safeFocusMainContent } from './primitives/safe-focus-main-content';

interface AppliedRecord {
  kind: AdaptationKind;
  primitive: AdaptationPrimitive;
  signature: string;
}

const primitiveFactories: Record<
  AdaptationKind,
  (context: PrimitiveContext) => AdaptationPrimitive
> = {
  ...deterministicPrimitiveFactories,
  ...semanticPrimitiveFactories,
  focusMainContent: safeFocusMainContent,
};

export class TransformEngine {
  readonly #applied = new Map<string, AppliedRecord>();
  readonly #errors: string[] = [];
  #currentPlan: AdaptationPlan | undefined;
  readonly #originalRootMarker: string | null;

  constructor(
    readonly document: Document,
    readonly registry: ElementRegistry,
  ) {
    this.#originalRootMarker = document.documentElement.getAttribute('data-aura-active');
  }

  applyPlan(plan: AdaptationPlan): PageStatus {
    return this.reconcilePlan(plan);
  }

  reconcilePlan(untrustedPlan: AdaptationPlan): PageStatus {
    const plan = adaptationPlanSchema.parse(untrustedPlan);
    this.#errors.length = 0;
    const nextIds = new Set(plan.instructions.map(({ id }) => id));

    for (const [id, applied] of this.#applied) {
      const next = plan.instructions.find((instruction) => instruction.id === id);
      const changed = next && JSON.stringify(next) !== applied.signature;
      if (!nextIds.has(id) || changed) {
        this.#safeRevert(id, applied);
      }
    }

    for (const instruction of plan.instructions) {
      if (this.#applied.has(instruction.id)) continue;
      const factory = primitiveFactories[instruction.kind];
      const primitive = factory({
        document: this.document,
        instruction,
        registry: this.registry,
      });
      try {
        primitive.apply();
        this.#applied.set(instruction.id, {
          kind: instruction.kind,
          primitive,
          signature: JSON.stringify(instruction),
        });
      } catch (error) {
        try {
          primitive.revert();
        } catch {
          // The original error is more useful and the engine continues safely.
        }
        this.#errors.push(
          `${instruction.kind}: ${error instanceof Error ? error.message : 'could not apply'}`,
        );
      }
    }

    this.#currentPlan = plan;
    this.#syncRootMarker();
    return this.getStatus();
  }

  refreshDynamicContent(): PageStatus {
    this.registry.registerSubtree(this.document);
    this.registry.prune();
    for (const [id, applied] of this.#applied) {
      try {
        applied.primitive.apply();
      } catch (error) {
        this.#errors.push(
          `${id}: ${error instanceof Error ? error.message : 'could not refresh'}`,
        );
      }
    }
    return this.getStatus();
  }

  revertInstruction(id: string): PageStatus {
    const applied = this.#applied.get(id);
    if (applied) this.#safeRevert(id, applied);
    this.#syncRootMarker();
    return this.getStatus();
  }

  revertAll(): PageStatus {
    for (const [id, applied] of [...this.#applied].reverse()) {
      this.#safeRevert(id, applied);
    }
    this.#currentPlan = undefined;
    this.#syncRootMarker();
    return this.getStatus();
  }

  getStatus(): PageStatus {
    const appliedKinds = this.#currentPlan
      ? this.#currentPlan.instructions
          .filter(({ id }) => this.#applied.has(id))
          .map(({ kind }) => kind)
      : [...this.#applied.values()].map(({ kind }) => kind);
    return {
      adapted: this.#applied.size > 0,
      appliedKinds,
      errors: [...this.#errors],
      ...(this.#currentPlan ? { plan: this.#currentPlan } : {}),
    };
  }

  #safeRevert(id: string, applied: AppliedRecord): void {
    try {
      applied.primitive.revert();
    } catch (error) {
      this.#errors.push(
        `${applied.kind}: ${error instanceof Error ? error.message : 'could not revert'}`,
      );
    } finally {
      this.#applied.delete(id);
    }
  }

  #syncRootMarker(): void {
    const root = this.document.documentElement;
    if (this.#applied.size > 0) {
      root.setAttribute('data-aura-active', 'true');
    } else if (this.#originalRootMarker === null) {
      root.removeAttribute('data-aura-active');
    } else {
      root.setAttribute('data-aura-active', this.#originalRootMarker);
    }
  }
}
