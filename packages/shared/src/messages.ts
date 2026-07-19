import { z } from './zod.js';

import { adaptationPlanSchema, semanticAdaptationPlanSchema } from './adaptation.js';
import { frictionSignalSchema, pageScanResultSchema } from './friction.js';
import { capabilityProfileSchema } from './profile.js';
import { rescueSuggestionSchema } from './rescue.js';
import { taskPlanSchema } from './task.js';

export const extensionMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PAGE_ADAPT'), profile: capabilityProfileSchema }),
  z.object({ type: z.literal('PAGE_REVERT') }),
  z.object({ type: z.literal('PAGE_STATUS_GET') }),
  z.object({ type: z.literal('PAGE_SCAN'), profile: capabilityProfileSchema }),
  z.object({
    type: z.literal('PAGE_LENS_SET'),
    enabled: z.boolean(),
    signals: z.array(frictionSignalSchema).max(100),
  }),
  z.object({ type: z.literal('PAGE_LENS_SELECT'), frictionId: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('PAGE_COMPARE_SET'), mode: z.enum(['original', 'adapted']) }),
  z.object({ type: z.literal('PAGE_TASK_APPLY'), plan: taskPlanSchema }),
  z.object({ type: z.literal('PAGE_TASK_STEP_SET'), stepId: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('PAGE_TASK_REVERT') }),
  z.object({ type: z.literal('PAGE_RESCUE_SET'), enabled: z.boolean() }),
  z.object({ type: z.literal('PAGE_RESCUE_STATUS_GET') }),
  z.object({ type: z.literal('PAGE_RESCUE_DISMISS'), suggestionId: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('PAGE_SNAPSHOT_GET') }),
  z.object({
    type: z.literal('PAGE_SEMANTIC_APPLY'),
    plan: semanticAdaptationPlanSchema,
  }),
  z.object({ type: z.literal('RESCUE_SUGGESTION'), suggestion: rescueSuggestionSchema }),
]);

export const pageStatusSchema = z.object({
  adapted: z.boolean(),
  appliedKinds: z.array(z.string()),
  errors: z.array(z.string()),
  plan: adaptationPlanSchema.optional(),
});

export const lensStatusSchema = z
  .object({
    enabled: z.boolean(),
    selectedFrictionId: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const taskStatusSchema = z
  .object({
    active: z.boolean(),
    stepId: z.string().trim().min(1).max(120).optional(),
    targetIds: z.array(z.string().regex(/^aura:n[1-9]\d*$/u)).max(10),
  })
  .strict();

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;
export type PageStatus = z.infer<typeof pageStatusSchema>;
export const pageScanResponseSchema = pageScanResultSchema;
export type LensStatus = z.infer<typeof lensStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export const pageRescueStatusSchema = z
  .object({
    enabled: z.boolean(),
    suggestion: rescueSuggestionSchema.optional(),
  })
  .strict();
export type PageRescueStatus = z.infer<typeof pageRescueStatusSchema>;
