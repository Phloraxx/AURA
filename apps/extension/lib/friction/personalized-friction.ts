import type {
  AdaptationPreferences,
  CapabilityDimension,
  CapabilityProfile,
  FrictionCategory,
  FrictionSignal,
  PersonalizedFriction,
} from '@aura/shared';

function supportNeed(dimension: CapabilityDimension): number {
  return (1 - dimension.capacity) * dimension.confidence;
}

function preferenceBoost(preferences: AdaptationPreferences, key: keyof AdaptationPreferences): number {
  if (typeof preferences[key] === 'boolean') return preferences[key] ? 0.8 : 0;
  if (key === 'textScale') return preferences.textScale > 1 ? 0.75 : 0;
  if (key === 'lineSpacing') return preferences.lineSpacing > 1 ? 0.7 : 0;
  if (key === 'readingWidth') return preferences.readingWidth !== 'normal' ? 0.65 : 0;
  if (key === 'targetSizePx') return preferences.targetSizePx > 44 ? 0.75 : 0;
  return 0;
}

function maxValue(...values: number[]): number {
  return Math.min(1, Math.max(...values));
}

export function relevanceForCategory(
  profile: Pick<CapabilityProfile, 'dimensions' | 'modalities' | 'preferences'>,
  category: FrictionCategory,
): number {
  const visual = supportNeed(profile.dimensions.visual);
  const motor = supportNeed(profile.dimensions.motor);
  const cognitive = supportNeed(profile.dimensions.cognitive);
  const attention = supportNeed(profile.dimensions.attention);
  const language = supportNeed(profile.dimensions.language);
  const keyboard = profile.modalities.preferredInput.includes('keyboard') ? 0.7 : 0;
  const screenReader = profile.modalities.screenReader ? 0.85 : 0;

  switch (category) {
    case 'readability':
      return maxValue(visual, preferenceBoost(profile.preferences, 'textScale'), preferenceBoost(profile.preferences, 'lineSpacing'));
    case 'interaction_target':
      return maxValue(motor, preferenceBoost(profile.preferences, 'enlargeTargets'), preferenceBoost(profile.preferences, 'targetSizePx'));
    case 'focus_navigation':
      return maxValue(motor, cognitive, attention, keyboard);
    case 'attention_clutter':
      return maxValue(attention, cognitive, preferenceBoost(profile.preferences, 'focusMode'), preferenceBoost(profile.preferences, 'hideDistractions'));
    case 'cognitive_workflow':
      return maxValue(cognitive, attention, preferenceBoost(profile.preferences, 'stepByStepForms'));
    case 'language_complexity':
      return maxValue(language, cognitive, preferenceBoost(profile.preferences, 'simplifyLanguage'));
    case 'motion':
      return maxValue(attention, preferenceBoost(profile.preferences, 'reduceMotion'));
    case 'control_clarity':
      return maxValue(language, cognitive, screenReader, preferenceBoost(profile.preferences, 'clarifyControls'));
    case 'form_complexity':
      return maxValue(cognitive, attention, motor, preferenceBoost(profile.preferences, 'stepByStepForms'));
  }
}

const RECOMMENDATIONS: Record<FrictionCategory, Array<keyof AdaptationPreferences>> = {
  readability: ['textScale', 'lineSpacing', 'readingWidth', 'contrast'],
  interaction_target: ['enlargeTargets', 'targetSizePx'],
  focus_navigation: ['focusMode'],
  attention_clutter: ['focusMode', 'hideDistractions'],
  cognitive_workflow: ['stepByStepForms', 'focusMode'],
  language_complexity: ['simplifyLanguage'],
  motion: ['reduceMotion'],
  control_clarity: ['clarifyControls'],
  form_complexity: ['stepByStepForms', 'enlargeTargets'],
};

export function personalizeFriction(
  signals: readonly FrictionSignal[],
  profile: Pick<CapabilityProfile, 'dimensions' | 'modalities' | 'preferences'>,
): PersonalizedFriction[] {
  return signals.map((signal) => {
    const profileRelevance = relevanceForCategory(profile, signal.category);
    return {
      signal,
      profileRelevance,
      impact: Math.min(1, signal.severity * signal.confidence * profileRelevance),
      recommendationKeys: RECOMMENDATIONS[signal.category],
    };
  });
}

export function recommendationKeysForCategory(
  category: FrictionCategory,
): readonly (keyof AdaptationPreferences)[] {
  return RECOMMENDATIONS[category];
}
