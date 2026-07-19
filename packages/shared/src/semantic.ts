import { z } from './zod.js';

export const pageElementIdSchema = z.string().regex(/^aura:n[1-9]\d*$/u);

export const pageElementSchema = z
  .object({
    id: pageElementIdSchema,
    kind: z.enum(['landmark', 'heading', 'text', 'control', 'form_group']),
    tag: z.string().regex(/^[a-z][a-z0-9-]{0,30}$/u),
    role: z.string().trim().min(1).max(40).optional(),
    text: z.string().trim().min(1).max(400).optional(),
    accessibleName: z.string().trim().min(1).max(200).optional(),
    inputKind: z
      .enum(['button', 'link', 'text', 'select', 'textarea', 'checkbox', 'radio', 'other'])
      .optional(),
    headingLevel: z.number().int().min(1).max(6).optional(),
    critical: z.boolean(),
  })
  .strict();

export const pageRepresentationSchema = z
  .object({
    title: z.string().trim().max(200),
    language: z.string().trim().min(2).max(35).optional(),
    elements: z.array(pageElementSchema).max(80),
    truncated: z.boolean(),
  })
  .strict();

export const pageAnalysisRequestSchema = z
  .object({ page: pageRepresentationSchema })
  .strict();

export const scoredSemanticTargetSchema = z
  .object({
    id: pageElementIdSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string().trim().min(1).max(240),
  })
  .strict();

export const ambiguousControlSchema = scoredSemanticTargetSchema
  .extend({ suggestedLabel: z.string().trim().min(1).max(120) })
  .strict();

export const semanticPageAnalysisSchema = z
  .object({
    mainContent: z.array(scoredSemanticTargetSchema).max(10),
    primaryActions: z.array(scoredSemanticTargetSchema).max(10),
    navigation: z.array(scoredSemanticTargetSchema).max(20),
    distractions: z.array(scoredSemanticTargetSchema).max(30),
    ambiguousControls: z.array(ambiguousControlSchema).max(30),
    complexTextBlocks: z.array(scoredSemanticTargetSchema).max(30),
    formGroups: z.array(scoredSemanticTargetSchema).max(20),
    warnings: z.array(z.string().trim().min(1).max(240)).max(10),
  })
  .strict();

export const SEMANTIC_CONFIDENCE = {
  distraction: 0.8,
  ambiguousControl: 0.75,
  primaryAction: 0.7,
  complexText: 0.7,
  mainContent: 0.7,
  formGroup: 0.7,
} as const;

export type PageElementRepresentation = z.infer<typeof pageElementSchema>;
export type PageRepresentation = z.infer<typeof pageRepresentationSchema>;
export type PageAnalysisRequest = z.infer<typeof pageAnalysisRequestSchema>;
export type ScoredSemanticTarget = z.infer<typeof scoredSemanticTargetSchema>;
export type SemanticPageAnalysis = z.infer<typeof semanticPageAnalysisSchema>;
