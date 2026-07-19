import { apiErrorSchema, taskPlanSchema, type TaskPlanRequest } from '@aura/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { type LLMProvider } from './providers/index.js';

const request: TaskPlanRequest = {
  goal: 'Apply for this job',
  page: {
    title: 'Job listing',
    truncated: false,
    elements: [
      { id: 'aura:n1', kind: 'landmark', tag: 'main', critical: false },
      { id: 'aura:n2', kind: 'form_group', tag: 'form', accessibleName: 'Application', critical: false },
      { id: 'aura:n3', kind: 'control', tag: 'button', accessibleName: 'Apply now', inputKind: 'button', critical: true },
    ],
  },
};

describe('POST /v1/task/plan', () => {
  it('returns a constrained plan from the deterministic provider', async () => {
    const response = await createApp().request('/v1/task/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });

    expect(response.status).toBe(200);
    const plan = taskPlanSchema.parse(await response.json());
    expect(plan.steps.flatMap(({ targetIds }) => targetIds)).toEqual(
      expect.arrayContaining(['aura:n1', 'aura:n2', 'aura:n3']),
    );
    expect(plan.warnings[0]).toMatch(/does not submit/u);
  });

  it('rejects invalid page IDs before calling the planner', async () => {
    const planTask = vi.fn<LLMProvider['planTask']>();
    const provider: LLMProvider = {
      onboarding: () => Promise.reject(new Error('not called')),
      analyzePage: () => Promise.reject(new Error('not called')),
      simplifyText: () => Promise.reject(new Error('not called')),
      planTask,
    };
    const response = await createApp({ llmProvider: provider }).request('/v1/task/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, page: { ...request.page, elements: [{ id: 'bad', kind: 'control', tag: 'button', critical: false }] } }),
    });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('invalid_task_request');
    expect(planTask).not.toHaveBeenCalled();
  });
});
