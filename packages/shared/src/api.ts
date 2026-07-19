import { z } from './zod.js';

import {
  adaptationPreferencesSchema,
  capabilityDimensionsSchema,
  capabilityProfileSchema,
  profileModalitiesSchema,
} from './profile.js';

export const transcriptEntrySchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string().trim().min(1).max(1_000),
});

export const capabilityProfilePatchSchema = z.object({
  dimensions: capabilityDimensionsSchema.partial().optional(),
  modalities: profileModalitiesSchema.partial().optional(),
  preferences: adaptationPreferencesSchema.partial().optional(),
});

export const onboardingRequestSchema = z.object({
  profile: capabilityProfileSchema,
  transcript: z.array(transcriptEntrySchema).max(16),
  userResponse: z.string().trim().min(1).max(2_000),
  askedAreas: z.array(z.string().trim().min(1).max(80)).max(8),
});

export const onboardingResponseSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(1_000),
  profilePatch: capabilityProfilePatchSchema,
  confidence: z.number().min(0).max(1),
  suggestedCalibrationTask: z
    .enum(['text_presentation', 'control_size', 'clutter_focus'])
    .nullable(),
  onboardingComplete: z.boolean(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string().optional(),
  }),
});

export const transcriptionResponseSchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  confidence: z.number().min(0).max(1).optional(),
});

export const simplifyTextRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    language: z.string().trim().min(2).max(35).optional(),
    desiredLevel: z.enum(['simple', 'very_simple']).optional(),
  })
  .strict();

export const simplifyTextResponseSchema = z
  .object({
    simplifiedText: z.string().trim().min(1).max(4_000),
    requiresOriginal: z.boolean(),
    warnings: z.array(z.string().trim().min(1).max(240)).max(10),
  })
  .strict();

export type CapabilityProfilePatch = z.infer<
  typeof capabilityProfilePatchSchema
>;
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;
export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;
export type SimplifyTextRequest = z.infer<typeof simplifyTextRequestSchema>;
export type SimplifyTextResponse = z.infer<typeof simplifyTextResponseSchema>;
