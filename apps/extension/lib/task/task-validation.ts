import { taskPlanSchema, type PageRepresentation, type TaskPlan } from '@aura/shared';

export function validateTaskPlanForPage(value: unknown, page: PageRepresentation): TaskPlan {
  const plan = taskPlanSchema.parse(value);
  const ids = new Set(page.elements.map(({ id }) => id));
  if (plan.steps.some((step) => step.targetIds.some((id) => !ids.has(id)))) {
    throw new Error('The task plan referenced an unavailable page element.');
  }

  const criticalIds = new Set(
    page.elements.filter(({ critical }) => critical).map(({ id }) => id),
  );
  return taskPlanSchema.parse({
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      critical: step.critical || step.targetIds.some((id) => criticalIds.has(id)),
    })),
  });
}
