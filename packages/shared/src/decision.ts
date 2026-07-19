import { z } from './zod.js';

export const adaptationDecisionSchema = z
  .object({
    instructionId: z.string().trim().min(1).max(120),
    kind: z.string().trim().min(1).max(60),
    source: z.enum(['deterministic', 'semantic_ai', 'manual']),
    targetIds: z.array(z.string().regex(/^aura:n[1-9]\d*$/u)).max(100),
    preferenceKey: z.string().trim().min(1).max(60).optional(),
    preferenceSource: z.enum(['default', 'capability', 'onboarding', 'calibration', 'explicit', 'legacy']).optional(),
    reason: z.string().trim().min(1).max(300),
    affectedCount: z.number().int().nonnegative(),
  })
  .strict();

export const adaptationDecisionListSchema = z.array(adaptationDecisionSchema).max(100);

export type AdaptationDecision = z.infer<typeof adaptationDecisionSchema>;
