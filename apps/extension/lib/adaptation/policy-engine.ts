import type {
  AdaptationInstruction,
  AdaptationPlan,
  LocalPageSignals,
  SemanticAdaptationPlan,
  SemanticPageAnalysis,
  SimplifyTextResponse,
} from '@aura/shared';

import type { PreferenceResolution } from '../profile/preference-resolver';

function instruction(
  kind: AdaptationInstruction['kind'],
  reason: string,
  options: Pick<AdaptationInstruction, 'params' | 'targetIds'> = {},
): AdaptationInstruction {
  return {
    id: `deterministic:${kind}`,
    kind,
    source: 'deterministic',
    reason,
    ...options,
  };
}

function preferenceReason(
  resolution: PreferenceResolution,
  key: keyof PreferenceResolution['preferences'],
  fallback: string,
): string {
  return resolution.reasons[key] ?? fallback;
}

export function createDeterministicPolicy(
  resolution: PreferenceResolution,
  page: LocalPageSignals,
): AdaptationPlan {
  const { preferences, modalities } = resolution;
  const instructions: AdaptationInstruction[] = [];

  if (preferences.textScale > 1) {
    instructions.push(
      instruction(
        'increaseTextScale',
        preferenceReason(resolution, 'textScale', 'Use the resolved text-size preference.'),
        { params: { scale: preferences.textScale } },
      ),
    );
  }
  if (preferences.lineSpacing > 1) {
    instructions.push(
      instruction(
        'increaseLineSpacing',
        preferenceReason(resolution, 'lineSpacing', 'Use the resolved line-spacing preference.'),
        { params: { spacing: preferences.lineSpacing } },
      ),
    );
  }
  if (preferences.readingWidth !== 'normal') {
    instructions.push(
      instruction(
        'limitReadingWidth',
        preferenceReason(resolution, 'readingWidth', 'Use the resolved reading-width preference.'),
        {
          params: { width: preferences.readingWidth },
          targetIds: page.mainContentIds,
        },
      ),
    );
  }
  if (preferences.contrast === 'enhanced') {
    instructions.push(
      instruction(
        'improveContrast',
        preferenceReason(resolution, 'contrast', 'Use the resolved enhanced-contrast preference.'),
      ),
    );
  }
  if (preferences.reduceMotion) {
    instructions.push(
      instruction(
        'reduceMotion',
        preferenceReason(resolution, 'reduceMotion', 'Use the resolved reduced-motion preference.'),
      ),
    );
  }
  if (preferences.enlargeTargets) {
    instructions.push(
      instruction(
        'enlargeTargets',
        preferenceReason(resolution, 'enlargeTargets', 'Use the resolved control-size preference.'),
        { params: { targetSizePx: preferences.targetSizePx } },
      ),
    );
  }
  if (modalities.preferredInput.includes('keyboard')) {
    instructions.push(
      instruction(
        'enhanceFocusIndicators',
        'Make keyboard focus easier to locate for a preferred input modality.',
      ),
    );
  }
  if (preferences.focusMode) {
    instructions.push(
      instruction(
        'focusMainContent',
        preferenceReason(resolution, 'focusMode', 'Use the resolved focus-mode preference.'),
        { targetIds: page.mainContentIds },
      ),
    );
  }

  return { version: 1, instructions };
}

export function createSemanticPolicy(
  resolution: PreferenceResolution,
  analysis: SemanticPageAnalysis,
  simplifications: Readonly<Record<string, SimplifyTextResponse>> = {},
): SemanticAdaptationPlan {
  const { preferences } = resolution;
  const instructions: SemanticAdaptationPlan['instructions'] = [];

  if (preferences.hideDistractions && analysis.distractions.length > 0) {
    instructions.push({
      id: 'semantic:collapse-distractions',
      kind: 'collapseDistractions',
      source: 'semantic_ai',
      targetIds: analysis.distractions.map(({ id }) => id),
      reason: preferenceReason(
        resolution,
        'hideDistractions',
        'Collapse high-confidence secondary content with a visible restore control.',
      ),
    });
  }
  if (preferences.focusMode && analysis.primaryActions.length > 0) {
    instructions.push({
      id: 'semantic:highlight-primary-actions',
      kind: 'highlightPrimaryAction',
      source: 'semantic_ai',
      targetIds: analysis.primaryActions.map(({ id }) => id),
      reason: preferenceReason(
        resolution,
        'focusMode',
        'Emphasize high-confidence primary actions without replacing controls.',
      ),
    });
  }
  if (preferences.clarifyControls) {
    for (const target of analysis.ambiguousControls) {
      instructions.push({
        id: `semantic:clarify:${target.id}`,
        kind: 'clarifyAmbiguousControls',
        source: 'semantic_ai',
        targetIds: [target.id],
        params: { suggestedLabel: target.suggestedLabel },
        reason: preferenceReason(
          resolution,
          'clarifyControls',
          'Add a conservative accessible name to an unlabeled control.',
        ),
      });
    }
  }
  if (preferences.simplifyLanguage) {
    for (const target of analysis.complexTextBlocks) {
      const result = simplifications[target.id];
      if (!result) continue;
      instructions.push({
        id: `semantic:simplify:${target.id}`,
        kind: 'simplifyText',
        source: 'semantic_ai',
        targetIds: [target.id],
        params: {
          simplifiedText: result.simplifiedText,
          requiresOriginal: result.requiresOriginal,
        },
        reason: preferenceReason(
          resolution,
          'simplifyLanguage',
          'Offer validated simpler wording while keeping the original available.',
        ),
      });
    }
  }

  const formGroups = analysis.formGroups ?? [];
  if (preferences.stepByStepForms && formGroups.length > 1) {
    instructions.push({
      id: 'semantic:guide-form-steps',
      kind: 'guideFormSteps',
      source: 'semantic_ai',
      targetIds: [...new Set(formGroups.flatMap(({ elementIds }) => elementIds))],
      params: { groups: formGroups },
      reason: preferenceReason(
        resolution,
        'stepByStepForms',
        'Guide the user through detected form groups without removing or rebuilding controls.',
      ),
    });
  }

  return { version: 1, instructions };
}
