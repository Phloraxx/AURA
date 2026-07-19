import {
  adaptationDecisionListSchema,
  type AdaptationDecision,
  type AdaptationPlan,
  type AdaptationPreferences,
} from '@aura/shared';

import type { PreferenceResolution } from '../profile/preference-resolver';

const PREFERENCE_KEYS: Partial<Record<AdaptationPlan['instructions'][number]['kind'], keyof AdaptationPreferences>> = {
  increaseTextScale: 'textScale',
  increaseLineSpacing: 'lineSpacing',
  limitReadingWidth: 'readingWidth',
  improveContrast: 'contrast',
  reduceMotion: 'reduceMotion',
  enlargeTargets: 'enlargeTargets',
  focusMainContent: 'focusMode',
  collapseDistractions: 'hideDistractions',
  clarifyAmbiguousControls: 'clarifyControls',
  simplifyText: 'simplifyLanguage',
  guideFormSteps: 'stepByStepForms',
};

export function createAdaptationDecisions(
  plan: AdaptationPlan,
  resolution: PreferenceResolution,
): AdaptationDecision[] {
  return adaptationDecisionListSchema.parse(
    plan.instructions.map((instruction) => {
      const preferenceKey = PREFERENCE_KEYS[instruction.kind];
      return {
        instructionId: instruction.id,
        kind: instruction.kind,
        source: instruction.source,
        targetIds: instruction.targetIds ?? [],
        ...(preferenceKey
          ? {
              preferenceKey,
              preferenceSource: resolution.sources[preferenceKey],
            }
          : {}),
        reason: instruction.reason,
        affectedCount: instruction.targetIds?.length ?? 0,
      };
    }),
  );
}

export function defaultValueForPreference(
  key: keyof AdaptationPreferences,
  current: AdaptationPreferences,
): AdaptationPreferences[keyof AdaptationPreferences] {
  if (typeof current[key] === 'boolean') return false;
  if (key === 'textScale' || key === 'lineSpacing') return 1;
  if (key === 'readingWidth') return 'normal';
  if (key === 'contrast') return 'default';
  if (key === 'targetSizePx') return 44;
  return current[key];
}
