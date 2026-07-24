import { z } from 'zod';

const targetRecommendationSchema = z.object({
  auraId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(180),
});

const secondaryRecommendationSchema = targetRecommendationSchema.extend({
  action: z.enum(['collapse', 'deemphasize']),
});

const simplificationRecommendationSchema = targetRecommendationSchema.extend({
  simplifiedText: z.string().trim().min(1).max(600),
});

const importantFactSchema = z.object({
  auraId: z.string().min(1).nullable(),
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(180),
});

const guideStepSchema = z.object({
  auraId: z.string().min(1),
  instruction: z.string().trim().min(1).max(180),
});

const guideSchema = z.object({
  steps: z.array(guideStepSchema).max(5),
  title: z.string().trim().min(1).max(100),
});

export const pageAnalysisModelOutputSchema = z.object({
  confidence: z.number().min(0).max(1),
  guide: guideSchema.nullable(),
  highlights: z.array(targetRecommendationSchema).max(3),
  importantFacts: z.array(importantFactSchema).max(4),
  pagePurpose: z.string().trim().min(1).max(180),
  primaryTargets: z.array(targetRecommendationSchema).max(6),
  secondaryTargets: z.array(secondaryRecommendationSchema).max(8),
  simplifications: z.array(simplificationRecommendationSchema).max(3),
  summary: z.string().trim().min(1).max(360),
});

export const semanticPlanSchema = z.object({
  collapseTargetIds: z.array(z.string().min(1)).max(5),
  deemphasizeTargetIds: z.array(z.string().min(1)).max(8),
  guide: guideSchema.nullable(),
  highlightTargetIds: z.array(z.string().min(1)).max(3),
  importantFacts: z.array(importantFactSchema).max(4),
  pageId: z.string().min(1),
  pagePurpose: z.string().trim().min(1).max(180),
  primaryTargetIds: z.array(z.string().min(1)).max(6),
  revision: z.number().int().positive(),
  simplifications: z
    .array(
      z.object({
        auraId: z.string().min(1),
        simplifiedText: z.string().trim().min(1).max(600),
      }),
    )
    .max(3),
  summary: z.string().trim().min(1).max(360),
});

export const pageAnalysisUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const pageAnalysisProviderResultSchema = z.object({
  error: z.string().nullable(),
  output: pageAnalysisModelOutputSchema.nullable(),
  source: z.enum(['ai', 'fallback']),
  usage: pageAnalysisUsageSchema.nullable(),
});

export const semanticAnalysisStateSchema = z.object({
  appliedCount: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative().nullable(),
  error: z.string().nullable(),
  pageId: z.string().nullable(),
  pagePurpose: z.string().nullable(),
  revision: z.number().int().positive().nullable(),
  source: z.enum(['ai', 'fallback']).nullable(),
  status: z.enum(['analyzing', 'fallback', 'idle', 'ready']),
  summary: z.string().nullable(),
  usage: pageAnalysisUsageSchema.nullable(),
});

export type PageAnalysisModelOutput = z.infer<
  typeof pageAnalysisModelOutputSchema
>;
export type PageAnalysisProviderResult = z.infer<
  typeof pageAnalysisProviderResultSchema
>;
export type SemanticAnalysisState = z.infer<
  typeof semanticAnalysisStateSchema
>;
export type SemanticPlan = z.infer<typeof semanticPlanSchema>;
