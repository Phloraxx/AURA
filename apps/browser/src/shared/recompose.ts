import { z } from 'zod';

import type { BrowserProfile } from './profile';

export const recomposePresetSchema = z.enum([
  'personalized',
  'clear_calm',
  'easier_to_see',
  'easy_to_control',
  'step_by_step',
]);

export const recomposeArchetypeSchema = z.enum([
  'article',
  'listing',
  'detail',
  'form',
  'dashboard',
  'general',
]);

export const recomposeActionSchema = z.object({
  auraId: z.string().min(1),
  behavior: z.enum(['click', 'focus', 'scroll']),
  label: z.string().trim().min(1).max(90),
  prominence: z.enum(['primary', 'secondary']),
});

export const recomposeItemSchema = z.object({
  action: recomposeActionSchema.nullable(),
  description: z.string().trim().max(360).nullable(),
  id: z.string().min(1),
  meta: z.array(z.string().trim().min(1).max(120)).max(4),
  targetAuraId: z.string().min(1).nullable(),
  title: z.string().trim().min(1).max(180),
});

export const recomposeSectionSchema = z.object({
  id: z.string().min(1),
  items: z.array(recomposeItemSchema).max(10),
  kind: z.enum(['hero', 'actions', 'results', 'content', 'form', 'facts']),
  title: z.string().trim().min(1).max(120),
});

export const recomposePlanSchema = z.object({
  archetype: recomposeArchetypeSchema,
  pageId: z.string().min(1),
  preset: recomposePresetSchema,
  revision: z.number().int().positive(),
  sections: z.array(recomposeSectionSchema).min(1).max(8),
  source: z.enum(['deterministic', 'local', 'cloud']),
  subtitle: z.string().trim().max(220).nullable(),
  summary: z.string().trim().max(360).nullable(),
  title: z.string().trim().min(1).max(180),
});

export const localRecomposeOutputSchema = z.object({
  archetype: recomposeArchetypeSchema,
  confidence: z.number().min(0).max(1),
  primaryTargetIds: z.array(z.string().min(1)).max(8),
  resultTargetIds: z.array(z.string().min(1)).max(10),
  sectionOrder: z
    .array(z.enum(['actions', 'results', 'content', 'form', 'facts']))
    .max(5),
  supportingTargetIds: z.array(z.string().min(1)).max(12),
  summary: z.string().trim().max(260),
});

export const recomposeStateSchema = z.object({
  error: z.string().nullable(),
  localDurationMs: z.number().nonnegative().nullable(),
  localModel: z.string().nullable(),
  pageId: z.string().nullable(),
  phase: z.enum([
    'idle',
    'focusing',
    'reshaping',
    'personalizing',
    'refining',
    'ready',
    'fallback',
  ]),
  preset: recomposePresetSchema,
  revision: z.number().int().positive().nullable(),
  source: z.enum(['deterministic', 'local', 'cloud']).nullable(),
});

export type LocalRecomposeOutput = z.infer<typeof localRecomposeOutputSchema>;
export type RecomposeAction = z.infer<typeof recomposeActionSchema>;
export type RecomposeArchetype = z.infer<typeof recomposeArchetypeSchema>;
export type RecomposeItem = z.infer<typeof recomposeItemSchema>;
export type RecomposePlan = z.infer<typeof recomposePlanSchema>;
export type RecomposePreset = z.infer<typeof recomposePresetSchema>;
export type RecomposeSection = z.infer<typeof recomposeSectionSchema>;
export type RecomposeState = z.infer<typeof recomposeStateSchema>;

export function profileForRecomposePreset(
  profile: BrowserProfile,
  preset: RecomposePreset,
): BrowserProfile {
  if (preset === 'personalized') return structuredClone(profile);

  const next = structuredClone(profile);
  if (preset === 'clear_calm') {
    next.capabilities.attention = 'important';
    next.preferences.explanationStyle = 'concise';
    next.preferences.informationDensity = 'calm';
    next.preferences.lineSpacing = Math.max(next.preferences.lineSpacing, 1.55);
    next.preferences.readingWidth = 'narrow';
    next.preferences.reduceMotion = true;
    next.preferences.targetSizePx = Math.max(next.preferences.targetSizePx, 52);
    next.preferences.textScale = Math.max(next.preferences.textScale, 1.1);
    next.summary = 'Clear & Calm: fewer simultaneous choices, quieter hierarchy, and concise explanations.';
  }
  if (preset === 'easier_to_see') {
    next.capabilities.visual = 'important';
    next.preferences.informationDensity = 'calm';
    next.preferences.lineSpacing = Math.max(next.preferences.lineSpacing, 1.7);
    next.preferences.readingWidth = 'narrow';
    next.preferences.strongFocus = true;
    next.preferences.targetSizePx = 60;
    next.preferences.textScale = Math.max(next.preferences.textScale, 1.35);
    next.summary = 'Easier to See: large reflowed content, strong hierarchy, and high-visibility controls.';
  }
  if (preset === 'easy_to_control') {
    next.capabilities.motor = 'important';
    next.preferences.informationDensity = 'calm';
    next.preferences.reduceMotion = true;
    next.preferences.strongFocus = true;
    next.preferences.targetSizePx = 60;
    next.preferences.textScale = Math.max(next.preferences.textScale, 1.08);
    next.summary = 'Easy to Control: large explicit controls, generous spacing, and minimal precision-dependent interaction.';
  }
  if (preset === 'step_by_step') {
    next.capabilities.attention = 'important';
    next.capabilities.cognitive = 'important';
    next.preferences.explanationStyle = 'concise';
    next.preferences.informationDensity = 'step_by_step';
    next.preferences.readingWidth = 'narrow';
    next.preferences.reduceMotion = true;
    next.preferences.strongFocus = true;
    next.preferences.targetSizePx = Math.max(next.preferences.targetSizePx, 52);
    next.preferences.textScale = Math.max(next.preferences.textScale, 1.1);
    next.summary = 'Step by Step: one clear stage at a time with progressive disclosure and obvious next actions.';
  }
  next.updatedAt = new Date().toISOString();
  return next;
}
