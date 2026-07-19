import { z } from './zod.js';

import { adaptationPlanSchema } from './adaptation.js';
import { semanticAdaptationPlanSchema } from './adaptation.js';
import { capabilityProfileSchema } from './profile.js';

export const extensionMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PAGE_ADAPT'), profile: capabilityProfileSchema }),
  z.object({ type: z.literal('PAGE_REVERT') }),
  z.object({ type: z.literal('PAGE_STATUS_GET') }),
  z.object({ type: z.literal('PAGE_SNAPSHOT_GET') }),
  z.object({
    type: z.literal('PAGE_SEMANTIC_APPLY'),
    plan: semanticAdaptationPlanSchema,
  }),
]);

export const pageStatusSchema = z.object({
  adapted: z.boolean(),
  appliedKinds: z.array(z.string()),
  errors: z.array(z.string()),
  plan: adaptationPlanSchema.optional(),
});

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;
export type PageStatus = z.infer<typeof pageStatusSchema>;
