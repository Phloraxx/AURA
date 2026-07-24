import { z } from 'zod';

import { pageAnalysisUsageSchema } from './semantic-analysis';

export const conversationRoleSchema = z.enum(['assistant', 'user']);
export const conversationActionFamilySchema = z.enum([
  'adjust',
  'explain',
  'goal_guide',
  'remember',
  'answer',
]);

export const conversationMessageSchema = z.object({
  content: z.string().trim().min(1).max(1_200),
  id: z.string().min(1),
  role: conversationRoleSchema,
});

export const sessionIntentSchema = z.object({
  goal: z.string().trim().min(1).max(240),
  preserveAcrossNavigation: z.boolean(),
});

export const conversationAdjustmentSchema = z.object({
  explanationStyle: z.enum(['concise', 'balanced', 'detailed']).nullable(),
  informationDensity: z.enum(['standard', 'calm', 'step_by_step']).nullable(),
  preserveTechnicalTerms: z.boolean().nullable(),
  reduceMotion: z.boolean().nullable(),
  targetSizePx: z.number().int().min(44).max(60).nullable(),
  textScale: z.number().min(1).max(1.5).nullable(),
});

const conversationGuideSchema = z.object({
  steps: z
    .array(
      z.object({
        auraId: z.string().min(1),
        instruction: z.string().trim().min(1).max(180),
      }),
    )
    .max(5),
  title: z.string().trim().min(1).max(100),
});

export const conversationAdaptationPatchSchema = z.object({
  deemphasizeTargetIds: z.array(z.string().min(1)).max(8),
  guide: conversationGuideSchema.nullable(),
  highlightTargetIds: z.array(z.string().min(1)).max(3),
  primaryTargetIds: z.array(z.string().min(1)).max(6),
});

export const memoryProposalSchema = z.object({
  preference: z.string().trim().min(5).max(300),
  reason: z.string().trim().min(1).max(180),
});

export const conversationExplanationSchema = z.object({
  targetAuraId: z.string().min(1).nullable(),
  text: z.string().trim().min(1).max(800),
});

export const conversationTurnRequestSchema = z.object({
  userMessage: z.string().trim().min(1).max(1_200),
});

export const conversationModelOutputSchema = z.object({
  actionFamily: conversationActionFamilySchema,
  adaptationPatch: conversationAdaptationPatchSchema.nullable(),
  adjustment: conversationAdjustmentSchema.nullable(),
  assistantMessage: z.string().trim().min(1).max(1_000),
  explanation: conversationExplanationSchema.nullable(),
  intent: sessionIntentSchema.nullable(),
  memoryProposal: memoryProposalSchema.nullable(),
});

export const conversationTurnResponseSchema =
  conversationModelOutputSchema.extend({
    source: z.enum(['ai', 'fallback']),
    usage: pageAnalysisUsageSchema.nullable(),
  });

export const conversationStateSchema = z.object({
  currentIntent: sessionIntentSchema.nullable(),
  messages: z.array(conversationMessageSchema).max(24),
  pendingMemory: memoryProposalSchema.nullable(),
  status: z.enum(['idle', 'responding']),
});

export const learnedPreferencesUpdateSchema = z.object({
  preferences: z.array(z.string().trim().min(5).max(300)).max(20),
});

export type ConversationAdaptationPatch = z.infer<
  typeof conversationAdaptationPatchSchema
>;
export type ConversationAdjustment = z.infer<
  typeof conversationAdjustmentSchema
>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationModelOutput = z.infer<
  typeof conversationModelOutputSchema
>;
export type ConversationState = z.infer<typeof conversationStateSchema>;
export type ConversationTurnRequest = z.infer<
  typeof conversationTurnRequestSchema
>;
export type ConversationTurnResponse = z.infer<
  typeof conversationTurnResponseSchema
>;
export type MemoryProposal = z.infer<typeof memoryProposalSchema>;
export type SessionIntent = z.infer<typeof sessionIntentSchema>;
