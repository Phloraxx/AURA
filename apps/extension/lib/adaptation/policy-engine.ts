import type {
  AdaptationInstruction,
  AdaptationPlan,
  CapabilityProfile,
  LocalPageSignals,
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
