import { z } from './zod.js';

export const rescueRecommendationKeySchema = z.enum([
  'enlargeTargets',
  'focusMode',
  'stepByStepForms',
  'reduceMotion',
  'simplifyLanguage',
]);

export const rescueKindSchema = z.enum([
  'near_miss',
  'focus_cycle',
  'keyboard_path',
  'scroll_oscillation',
]);

export const rescueSuggestionSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    kind: rescueKindSchema,
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(300),
    recommendationKey: rescueRecommendationKeySchema,
    targetIds: z.array(z.string().regex(/^aura:n[1-9]\d*$/u)).max(10),
  })
  .strict();

export const rescueStatusSchema = z
  .object({
    enabled: z.boolean(),
    suggestion: rescueSuggestionSchema.optional(),
  })
  .strict();

export type RescueRecommendationKey = z.infer<typeof rescueRecommendationKeySchema>;
export type RescueKind = z.infer<typeof rescueKindSchema>;
export type RescueSuggestion = z.infer<typeof rescueSuggestionSchema>;
export type RescueStatus = z.infer<typeof rescueStatusSchema>;
