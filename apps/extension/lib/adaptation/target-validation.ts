import { adaptationPlanSchema, type AdaptationInstruction, type AdaptationPlan } from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

const PRIMARY_CONTENT_SELECTOR = 'main, [role="main"], article';

function overlapsPrimaryContent(element: Element): boolean {
  return Boolean(
    element.matches(PRIMARY_CONTENT_SELECTOR) ||
      element.closest(PRIMARY_CONTENT_SELECTOR) ||
      element.querySelector(PRIMARY_CONTENT_SELECTOR),
  );
}

function safeTargetIds(
  instruction: AdaptationInstruction,
  registry: ElementRegistry,
): string[] {
  return (instruction.targetIds ?? []).filter((targetId) => {
    const element = registry.getElement(targetId);
    if (!element) return false;
    if (instruction.kind === 'collapseDistractions' && overlapsPrimaryContent(element)) {
      return false;
    }
    return true;
  });
}

export function validatePlanTargets(
  value: unknown,
  registry: ElementRegistry,
): AdaptationPlan {
  const plan = adaptationPlanSchema.parse(value);
  return {
    ...plan,
    instructions: plan.instructions.flatMap((instruction) => {
      const targetIds = safeTargetIds(instruction, registry);
      return targetIds.length > 0 ? [{ ...instruction, targetIds }] : [];
    }),
  };
}
