import {
  DEFAULT_ADAPTATION_PREFERENCES,
  adaptationPreferencePatchSchema,
  capabilityProfileSchema,
  type AdaptationPreferencePatch,
  type AdaptationPreferences,
  type CapabilityDimension,
  type CapabilityProfile,
  type PreferenceLayers,
  type ProfileModalities,
} from '@aura/shared';

export type PreferenceLayerName = keyof PreferenceLayers;
export type PreferenceSource =
  | 'default'
  | 'capability'
  | 'onboarding'
  | 'calibration'
  | 'explicit'
  | 'legacy';

export interface PreferenceResolution {
  preferences: AdaptationPreferences;
  modalities: ProfileModalities;
  sources: Record<keyof AdaptationPreferences, PreferenceSource>;
  reasons: Partial<Record<keyof AdaptationPreferences, string>>;
}

interface CapabilityRecommendations {
  preferences: AdaptationPreferencePatch;
  reasons: Partial<Record<keyof AdaptationPreferences, string>>;
}

function supportNeed(dimension: CapabilityDimension): number {
  return (1 - dimension.capacity) * dimension.confidence;
}

function assignRecommendation<Key extends keyof AdaptationPreferences>(
  recommendations: CapabilityRecommendations,
  key: Key,
  value: AdaptationPreferences[Key],
  reason: string,
): void {
  recommendations.preferences[key] = value;
  recommendations.reasons[key] = reason;
}

export function deriveCapabilityRecommendations(
  profile: Pick<CapabilityProfile, 'dimensions' | 'modalities'>,
): CapabilityRecommendations {
  const recommendations: CapabilityRecommendations = { preferences: {}, reasons: {} };
  const visual = supportNeed(profile.dimensions.visual);
  const motor = supportNeed(profile.dimensions.motor);
  const cognitive = supportNeed(profile.dimensions.cognitive);
  const attention = supportNeed(profile.dimensions.attention);
  const language = supportNeed(profile.dimensions.language);

  if (visual >= 0.25) {
    assignRecommendation(
      recommendations,
      'textScale',
      visual >= 0.7 ? 1.5 : visual >= 0.5 ? 1.3 : 1.15,
      'Recommended from the visual-comfort capability signal.',
    );
    assignRecommendation(
      recommendations,
      'lineSpacing',
      visual >= 0.7 ? 1.55 : visual >= 0.5 ? 1.4 : 1.2,
      'Recommended from the visual-comfort capability signal.',
    );
    if (visual >= 0.5) {
      assignRecommendation(
        recommendations,
        'readingWidth',
        visual >= 0.7 ? 'very_narrow' : 'narrow',
        'A narrower reading column is recommended from the visual-comfort capability signal.',
      );
    }
  }

  if (motor >= 0.25) {
    assignRecommendation(
      recommendations,
      'enlargeTargets',
      true,
      'Larger interaction targets are recommended from the motor-control capability signal.',
    );
    assignRecommendation(
      recommendations,
      'targetSizePx',
      motor >= 0.7 ? 60 : motor >= 0.5 ? 52 : 48,
      'Target size is recommended from the motor-control capability signal.',
    );
  }

  if (cognitive >= 0.4) {
    assignRecommendation(
      recommendations,
      'focusMode',
      true,
      'Focused content is recommended from the cognitive-workflow capability signal.',
    );
  }
  if (cognitive >= 0.45) {
    assignRecommendation(
      recommendations,
      'clarifyControls',
      true,
      'Clearer control labels are recommended from the cognitive-workflow capability signal.',
    );
  }
  if (cognitive >= 0.55) {
    assignRecommendation(
      recommendations,
      'stepByStepForms',
      true,
      'Guided form steps are recommended from the cognitive-workflow capability signal.',
    );
  }

  if (attention >= 0.25) {
    assignRecommendation(
      recommendations,
      'reduceMotion',
      true,
      'Reduced motion is recommended from the attention capability signal.',
    );
  }
  if (attention >= 0.45) {
    assignRecommendation(
      recommendations,
      'focusMode',
      true,
      'Focus mode is recommended from the attention capability signal.',
    );
  }
  if (attention >= 0.6) {
    assignRecommendation(
      recommendations,
      'hideDistractions',
      true,
      'Collapsing secondary distractions is recommended from the attention capability signal.',
    );
  }

  if (language >= 0.3) {
    assignRecommendation(
      recommendations,
      'clarifyControls',
      true,
      'Clearer control labels are recommended from the language-comfort capability signal.',
    );
  }
  if (language >= 0.55) {
    assignRecommendation(
      recommendations,
      'simplifyLanguage',
      true,
      'Simpler wording is recommended from the language-comfort capability signal.',
    );
  }

  return recommendations;
}

function layerHasValues(layer: AdaptationPreferencePatch): boolean {
  return Object.keys(layer).length > 0;
}

function legacyPreferencePatch(profile: CapabilityProfile): AdaptationPreferencePatch {
  const patch: AdaptationPreferencePatch = {};
  for (const key of Object.keys(DEFAULT_ADAPTATION_PREFERENCES) as Array<
    keyof AdaptationPreferences
  >) {
    if (profile.preferences[key] !== DEFAULT_ADAPTATION_PREFERENCES[key]) {
      (patch as Record<keyof AdaptationPreferences, AdaptationPreferences[keyof AdaptationPreferences]>)[
        key
      ] = profile.preferences[key];
    }
  }
  return patch;
}

function applyLayer(
  preferences: AdaptationPreferences,
  sources: PreferenceResolution['sources'],
  reasons: PreferenceResolution['reasons'],
  patch: AdaptationPreferencePatch,
  source: PreferenceSource,
  reason: string,
): void {
  for (const key of Object.keys(patch) as Array<keyof AdaptationPreferences>) {
    const value = patch[key];
    if (value === undefined) continue;
    (preferences as Record<keyof AdaptationPreferences, AdaptationPreferences[keyof AdaptationPreferences]>)[
      key
    ] = value;
    sources[key] = source;
    reasons[key] = reason;
  }
}

export function resolveAdaptationPreferences(profile: CapabilityProfile): PreferenceResolution {
  const preferences: AdaptationPreferences = { ...DEFAULT_ADAPTATION_PREFERENCES };
  const sources = Object.fromEntries(
    (Object.keys(DEFAULT_ADAPTATION_PREFERENCES) as Array<keyof AdaptationPreferences>).map((key) => [
      key,
      'default' as const,
    ]),
  ) as PreferenceResolution['sources'];
  const reasons: PreferenceResolution['reasons'] = {};
  const capability = deriveCapabilityRecommendations(profile);

  applyLayer(
    preferences,
    sources,
    reasons,
    capability.preferences,
    'capability',
    'Recommended from the capability profile.',
  );
  Object.assign(reasons, capability.reasons);

  const layers = profile.preferenceLayers;
  const hasProvenance =
    layerHasValues(layers.onboarding) ||
    layerHasValues(layers.calibration) ||
    layerHasValues(layers.explicit);

  if (!hasProvenance) {
    applyLayer(
      preferences,
      sources,
      reasons,
      legacyPreferencePatch(profile),
      'legacy',
      'Preserved from a profile created before preference provenance was available.',
    );
  }

  applyLayer(
    preferences,
    sources,
    reasons,
    layers.onboarding,
    'onboarding',
    'Set from an onboarding answer or adaptive onboarding recommendation.',
  );
  applyLayer(
    preferences,
    sources,
    reasons,
    layers.calibration,
    'calibration',
    'Chosen during an optional calibration activity.',
  );
  applyLayer(
    preferences,
    sources,
    reasons,
    layers.explicit,
    'explicit',
    'Explicitly chosen by the user.',
  );

  return { preferences, modalities: profile.modalities, sources, reasons };
}

function normalizedLayersForMutation(profile: CapabilityProfile): PreferenceLayers {
  const layers = profile.preferenceLayers;
  if (
    layerHasValues(layers.onboarding) ||
    layerHasValues(layers.calibration) ||
    layerHasValues(layers.explicit)
  ) {
    return layers;
  }
  const legacy = legacyPreferencePatch(profile);
  return layerHasValues(legacy) ? { ...layers, explicit: legacy } : layers;
}

export function withPreferenceLayer(
  profile: CapabilityProfile,
  layer: PreferenceLayerName,
  patch: AdaptationPreferencePatch,
): CapabilityProfile {
  const layers = normalizedLayersForMutation(profile);
  const next = capabilityProfileSchema.parse({
    ...profile,
    preferenceLayers: {
      ...layers,
      [layer]: { ...layers[layer], ...patch },
    },
  });
  return materializeResolvedProfile(next);
}

export function setExplicitPreference<Key extends keyof AdaptationPreferences>(
  profile: CapabilityProfile,
  key: Key,
  value: AdaptationPreferences[Key],
): CapabilityProfile {
  const patch: AdaptationPreferencePatch = { [key]: value };
  return withPreferenceLayer(profile, 'explicit', patch);
}

export function setExplicitPreferenceValue(
  profile: CapabilityProfile,
  key: keyof AdaptationPreferences,
  value: AdaptationPreferences[keyof AdaptationPreferences],
): CapabilityProfile {
  const patch = adaptationPreferencePatchSchema.parse({ [key]: value });
  return withPreferenceLayer(profile, 'explicit', patch);
}

export function clearExplicitPreference(
  profile: CapabilityProfile,
  key: keyof AdaptationPreferences,
): CapabilityProfile {
  const layers = normalizedLayersForMutation(profile);
  const explicit = { ...layers.explicit };
  delete explicit[key];
  const next = capabilityProfileSchema.parse({
    ...profile,
    preferenceLayers: { ...layers, explicit },
  });
  return materializeResolvedProfile(next);
}

export function clearAllExplicitPreferences(profile: CapabilityProfile): CapabilityProfile {
  const layers = normalizedLayersForMutation(profile);
  const next = capabilityProfileSchema.parse({
    ...profile,
    preferenceLayers: { ...layers, explicit: {} },
  });
  return materializeResolvedProfile(next);
}

export function materializeResolvedProfile(profile: CapabilityProfile): CapabilityProfile {
  return capabilityProfileSchema.parse({
    ...profile,
    preferences: resolveAdaptationPreferences(profile).preferences,
  });
}
