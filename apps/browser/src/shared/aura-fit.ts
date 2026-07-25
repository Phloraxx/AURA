import type { PageModel } from './page-model';
import type { BrowserProfile } from './profile';
import type { RecomposePreset } from './recompose';
import type { WcagScanResult } from './wcag';

export type AuraFitDimensionId =
  | 'interaction'
  | 'visual'
  | 'focus'
  | 'understanding'
  | 'task';

export interface AuraFitDimension {
  findings: string[];
  id: AuraFitDimensionId;
  label: string;
  maximum: number;
  score: number;
}

export interface AuraFitAdaptationEvidence {
  active: boolean;
  changedTargetCount: number;
  localSelectedTargetCount: number;
  preset: RecomposePreset;
  semanticAppliedCount: number;
}

export interface AuraFitResult {
  confidence: 'limited' | 'moderate' | 'strong';
  dimensions: AuraFitDimension[];
  score: number;
}

interface FitContext {
  adaptation: AuraFitAdaptationEvidence | null;
  page: PageModel;
  profile: BrowserProfile;
  scan: WcagScanResult;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : clamp(part / whole, 0, 1);
}

function supportMultiplier(
  support: 'default' | 'helpful' | 'important',
): number {
  if (support === 'important') return 1.2;
  return support === 'helpful' ? 1 : 0.78;
}

function issueRisk(
  scan: WcagScanResult,
  areas: Array<
    'attention' | 'auditory' | 'cognitive' | 'language' | 'motor' | 'visual'
  >,
): number {
  const impact = {
    critical: 5,
    minor: 1,
    moderate: 2.5,
    serious: 4,
  } as const;
  return scan.issues
    .filter((issue) => issue.areas.some((area) => areas.includes(area)))
    .reduce((total, issue) => {
      const prevalence = 1 + Math.min(1.75, Math.log2(issue.nodeCount + 1) / 4);
      return total + (issue.impact === null ? 2 : impact[issue.impact]) * prevalence;
    }, 0);
}

function adaptationCredits(
  context: FitContext,
): Record<AuraFitDimensionId, number> {
  const evidence = context.adaptation;
  if (evidence === null || !evidence.active) {
    return {
      focus: 0,
      interaction: 0,
      task: 0,
      understanding: 0,
      visual: 0,
    };
  }

  const { preferences } = context.profile;
  const credits = {
    focus:
      (preferences.informationDensity === 'calm'
        ? 7
        : preferences.informationDensity === 'step_by_step'
          ? 10
          : 3) + (preferences.reduceMotion ? 2 : 0),
    interaction:
      (preferences.targetSizePx >= 60
        ? 10
        : preferences.targetSizePx >= 52
          ? 7
          : 3) + (preferences.strongFocus ? 2 : 0),
    task:
      5 +
      (evidence.preset === 'step_by_step' ? 7 : 0) +
      Math.min(3, evidence.localSelectedTargetCount / 4),
    understanding:
      (preferences.explanationStyle === 'concise' ? 4 : 2) +
      Math.min(4, evidence.semanticAppliedCount / 2),
    visual:
      (preferences.textScale > 1 ? 5 : 2) +
      (preferences.lineSpacing >= 1.55 ? 4 : 1) +
      (preferences.readingWidth === 'narrow' ? 3 : 0),
  };

  if (evidence.changedTargetCount === 0) {
    credits.interaction = Math.min(credits.interaction, 4);
    credits.visual = Math.min(credits.visual, 5);
  }
  return credits;
}

export function calculateAuraFit(context: FitContext): AuraFitResult {
  const visibleElements = context.page.elements.filter((element) => element.visible);
  const interactive = visibleElements.filter((element) => element.interactive);
  const namedInteractive = interactive.filter(
    (element) => (element.accessibleName?.trim().length ?? 0) > 0,
  );
  const smallInteractive = interactive.filter((element) => {
    if (element.rect === null) return false;
    return (
      element.rect.width < context.profile.preferences.targetSizePx ||
      element.rect.height < context.profile.preferences.targetSizePx
    );
  });
  const textElements = visibleElements.filter(
    (element) => element.category === 'text' || element.category === 'heading',
  );
  const desiredTextSize = 16 * context.profile.preferences.textScale;
  const smallText = textElements.filter(
    (element) =>
      element.fontSizePx !== null && element.fontSizePx < desiredTextSize,
  );
  const tightText = textElements.filter(
    (element) =>
      element.fontSizePx !== null &&
      element.lineHeightPx !== null &&
      element.lineHeightPx / element.fontSizePx < 1.4,
  );
  const longText = textElements.filter((element) => element.textLength > 280);
  const totalFormControls = context.page.forms.reduce(
    (total, form) => total + form.totalControlCount,
    0,
  );
  const labeledFormControls = context.page.forms.reduce(
    (total, form) => total + form.labeledControlCount,
    0,
  );
  const repeatedItems = context.page.repeatedStructures.reduce(
    (total, item) => total + item.count,
    0,
  );
  const unlabeledFormRatio =
    totalFormControls === 0
      ? 0
      : 1 - ratio(labeledFormControls, totalFormControls);
  const densityTarget =
    context.profile.preferences.informationDensity === 'step_by_step'
      ? 18
      : context.profile.preferences.informationDensity === 'calm'
        ? 30
        : 50;
  const taskTarget =
    context.profile.preferences.informationDensity === 'step_by_step'
      ? 6
      : context.profile.preferences.informationDensity === 'calm'
        ? 10
        : 16;

  const deductions: Record<AuraFitDimensionId, number> = {
    focus:
      supportMultiplier(context.profile.capabilities.attention) *
      (12 *
        clamp(
          (visibleElements.length - densityTarget) / Math.max(1, densityTarget),
          0,
          1,
        ) +
        4 * ratio(repeatedItems, Math.max(1, visibleElements.length)) +
        Math.min(4, issueRisk(context.scan, ['attention']))),
    interaction:
      supportMultiplier(context.profile.capabilities.motor) *
      (12 * ratio(smallInteractive.length, interactive.length) +
        6 *
          (1 - ratio(namedInteractive.length, interactive.length)) +
        Math.min(7, issueRisk(context.scan, ['motor']))),
    task:
      Math.max(
        supportMultiplier(context.profile.capabilities.cognitive),
        supportMultiplier(context.profile.capabilities.motor),
      ) *
      (9 *
        clamp(
          (interactive.length - taskTarget) / Math.max(1, taskTarget),
          0,
          1,
        ) +
        4 * unlabeledFormRatio +
        (context.page.extractionHealth.hasPrimaryRegion ? 0 : 2)),
    understanding:
      Math.max(
        supportMultiplier(context.profile.capabilities.cognitive),
        supportMultiplier(context.profile.capabilities.language),
        supportMultiplier(context.profile.capabilities.auditory),
      ) *
      (7 * ratio(longText.length, textElements.length) +
        4 * unlabeledFormRatio +
        Math.min(
          6,
          issueRisk(context.scan, [
            'auditory',
            'cognitive',
            'language',
          ]),
        )),
    visual:
      supportMultiplier(context.profile.capabilities.visual) *
      (10 * ratio(smallText.length, textElements.length) +
        5 * ratio(tightText.length, textElements.length) +
        Math.min(10, issueRisk(context.scan, ['visual']))),
  };
  const credits = adaptationCredits(context);

  const dimensionSource: Array<{
    id: AuraFitDimensionId;
    label: string;
    maximum: number;
  }> = [
    { id: 'interaction', label: 'Interaction', maximum: 25 },
    { id: 'visual', label: 'Visual comfort', maximum: 25 },
    { id: 'focus', label: 'Focus', maximum: 20 },
    { id: 'understanding', label: 'Understanding', maximum: 15 },
    { id: 'task', label: 'Task simplicity', maximum: 15 },
  ];

  const findings: Record<AuraFitDimensionId, string[]> = {
    focus: [
      visibleElements.length > densityTarget
        ? `${visibleElements.length} useful elements compete with a ${densityTarget}-element comfort target.`
        : 'The amount of visible information is within this profile’s comfort target.',
      ...(repeatedItems > 4
        ? [`${repeatedItems} repeated items add scanning effort.`]
        : []),
    ],
    interaction: [
      smallInteractive.length > 0
        ? `${smallInteractive.length} of ${interactive.length} controls are smaller than the ${context.profile.preferences.targetSizePx}px comfort target.`
        : 'Detected controls meet this profile’s target-size preference.',
      ...(namedInteractive.length < interactive.length
        ? [
            `${interactive.length - namedInteractive.length} controls do not expose a clear accessible name.`,
          ]
        : []),
    ],
    task: [
      interactive.length > taskTarget
        ? `${interactive.length} controls are presented where this profile benefits from fewer simultaneous choices.`
        : 'The available actions are within this profile’s task-load target.',
      ...(context.page.forms.length > 0
        ? [`${context.page.forms.length} form region${context.page.forms.length === 1 ? '' : 's'} require sequencing and clear labels.`]
        : []),
    ],
    understanding: [
      longText.length > 0
        ? `${longText.length} dense text region${longText.length === 1 ? '' : 's'} may require extra processing.`
        : 'No unusually dense text region was detected.',
      ...(totalFormControls > labeledFormControls
        ? [
            `${totalFormControls - labeledFormControls} form controls need clearer labeling evidence.`,
          ]
        : []),
    ],
    visual: [
      smallText.length > 0
        ? `${smallText.length} text regions are smaller than this profile’s ${Math.round(desiredTextSize)}px reading target.`
        : 'Detected text meets this profile’s preferred reading size.',
      ...(tightText.length > 0
        ? [`${tightText.length} text regions use tighter than 1.4 line spacing.`]
        : []),
    ],
  };

  const dimensions = dimensionSource.map(({ id, label, maximum }) => {
    const score = Math.round(
      clamp(maximum - deductions[id] + credits[id], 0, maximum),
    );
    if (context.adaptation?.active && credits[id] >= 2) {
      const supportFinding: Record<AuraFitDimensionId, string> = {
        focus:
          'AURA is presenting a quieter hierarchy with fewer simultaneous choices.',
        interaction:
          'AURA is presenting larger explicit controls and stronger focus cues.',
        task:
          'AURA reorganized real page actions into a shorter, clearer path.',
        understanding:
          context.adaptation.semanticAppliedCount > 0
            ? `AURA applied ${context.adaptation.semanticAppliedCount} validated semantic refinements.`
            : 'AURA is using a concise trusted presentation while preserving the source content.',
        visual:
          'AURA applied the profile’s text scale, spacing, and reading-width preferences.',
      };
      findings[id].unshift(supportFinding[id]);
    }
    return { findings: findings[id], id, label, maximum, score };
  });

  return {
    confidence:
      context.scan.needsReviewRules > 0
        ? 'limited'
        : context.page.extractionHealth.score < 0.75
          ? 'moderate'
          : 'strong',
    dimensions,
    score: dimensions.reduce((total, dimension) => total + dimension.score, 0),
  };
}
