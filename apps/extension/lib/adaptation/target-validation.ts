import { adaptationPlanSchema, type AdaptationPlan } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

export function validatePlanTargets(
  value: unknown,
  registry: ElementRegistry,
): AdaptationPlan {
  const plan = adaptationPlanSchema.parse(value);
  return {
    ...plan,
    instructions: plan.instructions.filter((instruction) => {
      const targetIds = instruction.targetIds ?? [];
      return targetIds.length > 0 && targetIds.every((targetId) => registry.has(targetId));
    }),
  };
}
