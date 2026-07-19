import { taskPlanSchema, type PageRepresentation, type TaskPlan } from '@aura/shared';

export function validateTaskPlanForPage(value: unknown, page: PageRepresentation): TaskPlan {
  const plan = taskPlanSchema.parse(value);
  const ids = new Set(page.elements.map(({ id }) => id));
  if (plan.steps.some((step) => step.targetIds.some((id) => !ids.has(id)))) {
    throw new Error('The task plan referenced an unavailable page element.');
  }
  return plan;
}
