import { type PageRepresentation } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import { validateTaskPlanForPage } from './task-validation';

const page: PageRepresentation = {
  title: 'Job page',
  truncated: false,
  elements: [{ id: 'aura:n1', kind: 'control', tag: 'button', critical: true }],
};

describe('task plan validation', () => {
  it('accepts plans whose steps reference the current page', () => {
    expect(validateTaskPlanForPage({
      version: 1,
      task: { id: 'task:apply', label: 'Apply', rawUserGoal: 'Apply', kind: 'apply' },
      steps: [{ id: 'step:1', label: 'Review action', targetIds: ['aura:n1'], optional: false, critical: true }],
      warnings: ['You decide whether to activate the control.'],
    }, page).steps[0]?.targetIds).toEqual(['aura:n1']);
  });

  it('promotes steps targeting critical page elements even when the model marks them non-critical', () => {
    const plan = validateTaskPlanForPage({
      version: 1,
      task: { id: 'task:apply', label: 'Apply', rawUserGoal: 'Apply', kind: 'apply' },
      steps: [{ id: 'step:1', label: 'Review action', targetIds: ['aura:n1'], optional: false, critical: false }],
      warnings: [],
    }, page);

    expect(plan.steps[0]?.critical).toBe(true);
  });

  it('rejects model plans that invent element IDs', () => {
    expect(() => validateTaskPlanForPage({
      version: 1,
      task: { id: 'task:apply', label: 'Apply', rawUserGoal: 'Apply', kind: 'apply' },
      steps: [{ id: 'step:1', label: 'Invented', targetIds: ['aura:n99'], optional: false, critical: true }],
      warnings: ['Warning'],
    }, page)).toThrow(/unavailable/u);
  });
});
