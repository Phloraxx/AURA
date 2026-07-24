import { z } from 'zod';

import type { BrowserProfile } from './profile';
import { semanticPlanSchema } from './semantic-analysis';

export const presentationSettingsSchema = z.object({
  lineSpacing: z.number().min(1).max(2),
  readingWidth: z.enum(['normal', 'narrow']),
  reduceMotion: z.boolean(),
  strongFocus: z.boolean(),
  targetSizePx: z.number().int().min(44).max(60),
  textScale: z.number().min(1).max(1.5),
});

export const adaptationViewSchema = z.enum(['aura', 'original']);

export const adaptationCommandSchema = z.discriminatedUnion('type', [
  z.object({
    pageId: z.string().min(1),
    revision: z.number().int().positive(),
    settings: presentationSettingsSchema,
    type: z.literal('apply-presentation'),
  }),
  z.object({
    pageId: z.string().min(1),
    plan: semanticPlanSchema,
    revision: z.number().int().positive(),
    type: z.literal('apply-semantic'),
  }),
  z.object({
    pageId: z.string().min(1),
    revision: z.number().int().positive(),
    settings: presentationSettingsSchema,
    type: z.literal('update-presentation'),
  }),
  z.object({
    pageId: z.string().min(1),
    type: z.literal('set-adaptation-view'),
    view: adaptationViewSchema,
  }),
]);

export const adaptationEventSchema = z.object({
  changedTargetCount: z.number().int().nonnegative(),
  error: z.string().nullable(),
  operation: z.enum(['presentation', 'semantic', 'view']),
  pageId: z.string().min(1),
  status: z.enum(['applied', 'failed', 'restored']),
  view: adaptationViewSchema,
});

export const adaptationStateSchema = z.object({
  changedTargetCount: z.number().int().nonnegative(),
  error: z.string().nullable(),
  pageId: z.string().nullable(),
  status: z.enum(['applying', 'idle', 'ready']),
  view: adaptationViewSchema,
});

export type AdaptationCommand = z.infer<typeof adaptationCommandSchema>;
export type AdaptationEvent = z.infer<typeof adaptationEventSchema>;
export type AdaptationState = z.infer<typeof adaptationStateSchema>;
export type AdaptationView = z.infer<typeof adaptationViewSchema>;
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>;

export function presentationSettingsFromProfile(
  profile: BrowserProfile,
): PresentationSettings {
  return presentationSettingsSchema.parse({
    lineSpacing: profile.preferences.lineSpacing,
    readingWidth: profile.preferences.readingWidth,
    reduceMotion: profile.preferences.reduceMotion,
    strongFocus: profile.preferences.strongFocus,
    targetSizePx: profile.preferences.targetSizePx,
    textScale: profile.preferences.textScale,
  });
}
