import { z } from './zod.js';

export const taskKindSchema = z.enum([
  'read_content',
  'complete_form',
  'apply',
  'purchase',
  'find_information',
  'compare',
  'other',
]);

export const taskIntentSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(160),
    rawUserGoal: z.string().trim().min(1).max(1_000),
    kind: taskKindSchema,
  })
  .strict();

export const taskStepSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(300).optional(),
    targetIds: z.array(z.string().regex(/^aura:n[1-9]\d*$/u)).max(10),
    optional: z.boolean(),
    critical: z.boolean(),
  })
  .strict();

export const taskPlanSchema = z
  .object({
    version: z.literal(1),
    task: taskIntentSchema,
    steps: z.array(taskStepSchema).min(1).max(12),
    warnings: z.array(z.string().trim().min(1).max(300)).max(10),
  })
  .strict();

export type TaskKind = z.infer<typeof taskKindSchema>;
export type TaskIntent = z.infer<typeof taskIntentSchema>;
export type TaskStep = z.infer<typeof taskStepSchema>;
export type TaskPlan = z.infer<typeof taskPlanSchema>;
