import { z } from './zod.js';

export const frictionCategorySchema = z.enum([
  'readability',
  'interaction_target',
  'focus_navigation',
  'attention_clutter',
  'cognitive_workflow',
  'language_complexity',
  'motion',
  'control_clarity',
  'form_complexity',
]);

export const frictionSourceSchema = z.enum(['local', 'semantic_ai']);

export const frictionSignalSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    category: frictionCategorySchema,
    targetIds: z.array(z.string().regex(/^aura:n[1-9]\d*$/u)).max(10),
    severity: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    source: frictionSourceSchema,
    reason: z.string().trim().min(1).max(300),
    critical: z.boolean(),
  })
  .strict();

export const personalizedFrictionSchema = z
  .object({
    signal: frictionSignalSchema,
    profileRelevance: z.number().min(0).max(1),
    impact: z.number().min(0).max(1),
    recommendationKeys: z.array(z.string().trim().min(1).max(60)).max(8),
  })
  .strict();

export const auraFitCategorySchema = z
  .object({
    category: frictionCategorySchema,
    risk: z.number().min(0).max(1),
    signalCount: z.number().int().nonnegative(),
    topReason: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export const auraFitBreakdownSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    label: z.enum([
      'Strong fit',
      'Mostly comfortable',
      'Some friction',
      'Needs adaptation',
    ]),
    categories: z.array(auraFitCategorySchema).max(9),
    topFrictionIds: z.array(z.string().trim().min(1).max(120)).max(10),
    isHeuristic: z.literal(true),
  })
  .strict();

export const pageScanResultSchema = z
  .object({
    pageId: z.string().trim().min(1).max(200),
    localSignals: z.array(frictionSignalSchema).max(100),
    semanticSignals: z.array(frictionSignalSchema).max(100),
    fit: auraFitBreakdownSchema,
    scannedAt: z.iso.datetime(),
  })
  .strict();

export type FrictionCategory = z.infer<typeof frictionCategorySchema>;
export type FrictionSignal = z.infer<typeof frictionSignalSchema>;
export type PersonalizedFriction = z.infer<typeof personalizedFrictionSchema>;
export type AuraFitCategory = z.infer<typeof auraFitCategorySchema>;
export type AuraFitBreakdown = z.infer<typeof auraFitBreakdownSchema>;
export type PageScanResult = z.infer<typeof pageScanResultSchema>;
