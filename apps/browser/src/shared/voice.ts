import { z } from 'zod';

export const voiceTranscriptionRequestSchema = z.object({
  bytes: z.array(z.number().int().min(0).max(255)).min(1).max(8_000_000),
  mimeType: z.string().trim().min(1).max(120),
});

export const voiceTranscriptionResponseSchema = z.object({
  durationMs: z.number().nonnegative(),
  text: z.string().trim().min(1).max(4_000),
});

export type VoiceTranscriptionRequest = z.infer<
  typeof voiceTranscriptionRequestSchema
>;
export type VoiceTranscriptionResponse = z.infer<
  typeof voiceTranscriptionResponseSchema
>;
