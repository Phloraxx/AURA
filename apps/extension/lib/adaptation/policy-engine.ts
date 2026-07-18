import type {
  AdaptationInstruction,
  AdaptationPlan,
  CapabilityProfile,
  LocalPageSignals,
  SemanticAdaptationPlan,
  SemanticPageAnalysis,
  SimplifyTextResponse,
} from '@aura/shared';

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

export function createDeterministicPolicy(
  profile: CapabilityProfile,
  page: LocalPageSignals,
): AdaptationPlan {
  const { preferences, modalities } = profile;
  const instructions: AdaptationInstruction[] = [];

  if (preferences.textScale > 1) {
    instructions.push(
      instruction('increaseTextScale', 'Use the explicit text-size preference.', {
        params: { scale: preferences.textScale },
      }),
    );
  }
  if (preferences.lineSpacing > 1) {
    instructions.push(
      instruction('increaseLineSpacing', 'Use the explicit line-spacing preference.', {
        params: { spacing: preferences.lineSpacing },
      }),
    );
  }
  if (preferences.readingWidth !== 'normal') {
    instructions.push(
      instruction('limitReadingWidth', 'Use the explicit reading-width preference.', {
        params: { width: preferences.readingWidth },
        targetIds: page.mainContentIds,
      }),
    );
  }
  if (preferences.contrast === 'enhanced') {
    instructions.push(
      instruction('improveContrast', 'Use the explicit enhanced-contrast preference.'),
    );
  }
  if (preferences.reduceMotion) {
    instructions.push(
      instruction('reduceMotion', 'Use the explicit reduced-motion preference.'),
    );
  }
  if (preferences.enlargeTargets) {
    instructions.push(
      instruction('enlargeTargets', 'Use the explicit control-size preference.', {
        params: { targetSizePx: preferences.targetSizePx },
      }),
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
      instruction('focusMainContent', 'Use the explicit focus-mode preference.', {
        targetIds: page.mainContentIds,
      }),
    );
  }

  return { version: 1, instructions };
}

export function createSemanticPolicy(
  profile: CapabilityProfile,
  analysis: SemanticPageAnalysis,
  simplifications: Readonly<Record<string, SimplifyTextResponse>> = {},
): SemanticAdaptationPlan {
  const instructions: SemanticAdaptationPlan['instructions'] = [];

  if (profile.preferences.hideDistractions && analysis.distractions.length > 0) {
    instructions.push({
      id: 'semantic:collapse-distractions',
      kind: 'collapseDistractions',
      source: 'semantic_ai',
      targetIds: analysis.distractions.map(({ id }) => id),
      reason: 'Collapse high-confidence secondary content with a visible restore control.',
    });
  }
  if (profile.preferences.focusMode && analysis.primaryActions.length > 0) {
    instructions.push({
      id: 'semantic:highlight-primary-actions',
      kind: 'highlightPrimaryAction',
      source: 'semantic_ai',
      targetIds: analysis.primaryActions.map(({ id }) => id),
      reason: 'Emphasize high-confidence primary actions without replacing controls.',
    });
  }
  if (profile.preferences.clarifyControls) {
    for (const target of analysis.ambiguousControls) {
      instructions.push({
        id: `semantic:clarify:${target.id}`,
        kind: 'clarifyAmbiguousControls',
        source: 'semantic_ai',
        targetIds: [target.id],
        params: { suggestedLabel: target.suggestedLabel },
        reason: 'Add a conservative accessible name to an unlabeled control.',
      });
    }
  }
  if (profile.preferences.simplifyLanguage) {
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
        reason: 'Offer validated simpler wording while keeping the original available.',
      });
    }
  }

  return { version: 1, instructions };
}
