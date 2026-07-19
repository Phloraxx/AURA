import { z } from './zod.js';

export const deterministicAdaptationKindSchema = z.enum([
  'increaseTextScale',
  'increaseLineSpacing',
  'limitReadingWidth',
  'improveContrast',
  'reduceMotion',
  'enlargeTargets',
  'enhanceFocusIndicators',
  'focusMainContent',
]);

export const semanticAdaptationKindSchema = z.enum([
  'collapseDistractions',
  'highlightPrimaryAction',
  'clarifyAmbiguousControls',
  'simplifyText',
  'guideFormSteps',
]);

export const adaptationKindSchema = z.union([
  deterministicAdaptationKindSchema,
  semanticAdaptationKindSchema,
]);

export const adaptationInstructionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  kind: adaptationKindSchema,
  source: z.enum(['deterministic', 'semantic_ai', 'manual']),
  targetIds: z.array(z.string().trim().min(1).max(120)).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().trim().min(1).max(300),
});

export const adaptationPlanSchema = z.object({
  version: z.literal(1),
  instructions: z.array(adaptationInstructionSchema).max(100),
});

export const semanticAdaptationInstructionSchema = adaptationInstructionSchema.extend({
  kind: semanticAdaptationKindSchema,
  source: z.literal('semantic_ai'),
});

export const semanticAdaptationPlanSchema = z.object({
  version: z.literal(1),
  instructions: z.array(semanticAdaptationInstructionSchema).max(100),
});

export const localPageSignalsSchema = z.object({
  mainContentIds: z.array(z.string()).max(10),
  interactiveElementCount: z.number().int().nonnegative(),
  visibleTextLength: z.number().int().nonnegative(),
  hasArticleLandmark: z.boolean(),
  hasMainLandmark: z.boolean(),
});

export type DeterministicAdaptationKind = z.infer<
  typeof deterministicAdaptationKindSchema
>;
export type SemanticAdaptationKind = z.infer<
  typeof semanticAdaptationKindSchema
>;
export type AdaptationKind = z.infer<typeof adaptationKindSchema>;
export type AdaptationInstruction = z.infer<
  typeof adaptationInstructionSchema
>;
export type AdaptationPlan = z.infer<typeof adaptationPlanSchema>;
export type SemanticAdaptationPlan = z.infer<typeof semanticAdaptationPlanSchema>;
export type LocalPageSignals = z.infer<typeof localPageSignalsSchema>;

export const EMPTY_PAGE_SIGNALS: LocalPageSignals = {
  mainContentIds: [],
  interactiveElementCount: 0,
  visibleTextLength: 0,
  hasArticleLandmark: false,
  hasMainLandmark: false,
};
