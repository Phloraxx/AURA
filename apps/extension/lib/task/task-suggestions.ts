import { taskPlanSchema, type PageRepresentation, type TaskPlan } from '@aura/shared';

function textFor(page: PageRepresentation, id: string): string {
  const element = page.elements.find((candidate) => candidate.id === id);
  return `${element?.accessibleName ?? ''} ${element?.text ?? ''}`.trim();
}

export function suggestedTaskGoals(page: PageRepresentation): string[] {
  const goals: string[] = [];
  if (page.elements.some(({ kind }) => kind === 'form_group')) goals.push('Complete this form');
  if (page.elements.some(({ kind }) => kind === 'landmark')) goals.push('Read this page');
  if (page.elements.some((element) => element.kind === 'control' && /apply|submit|continue|checkout|cart|buy/iu.test(textFor(page, element.id)))) {
    goals.push('Find the main action');
  }
  return [...new Set(goals)].slice(0, 3);
}

export function createDeterministicTaskPlan(page: PageRepresentation, goal: string): TaskPlan {
  const lower = goal.toLowerCase();
  const textForElement = (id: string) => textFor(page, id);
  const main = page.elements.find(({ kind, tag }) => kind === 'landmark' && (tag === 'main' || tag === 'article'));
  const form = page.elements.find(({ kind }) => kind === 'form_group');
  const action = page.elements.find((element) => element.kind === 'control' && /apply|submit|continue|checkout|cart|buy|start/iu.test(textForElement(element.id)));
  const kind = /form|complete|register/iu.test(lower) ? 'complete_form' : /apply|job/iu.test(lower) ? 'apply' : /read/iu.test(lower) ? 'read_content' : /purchase|checkout|buy/iu.test(lower) ? 'purchase' : 'find_information';
  const steps: TaskPlan['steps'] = [];
  if (main) steps.push({ id: 'task-step:main', label: 'Review the main page information', targetIds: [main.id], optional: false, critical: false });
  if (form && (kind === 'complete_form' || kind === 'apply')) steps.push({ id: 'task-step:form', label: 'Work through the form sections', targetIds: [form.id], optional: false, critical: false });
  if (action) steps.push({ id: 'task-step:action', label: 'Review the relevant action', targetIds: [action.id], optional: false, critical: Boolean(page.elements.find(({ id }) => id === action.id)?.critical) });
  if (steps.length === 0 && main) steps.push({ id: 'task-step:main-only', label: 'Review the main content', targetIds: [main.id], optional: false, critical: false });
  const plan = {
    version: 1 as const,
    task: { id: `task:${kind}`, label: goal.trim(), rawUserGoal: goal.trim(), kind },
    steps,
    warnings: ['AURA highlights original controls but never submits forms or approves critical actions for you.'],
  };
  return taskPlanSchema.parse(plan);
}
