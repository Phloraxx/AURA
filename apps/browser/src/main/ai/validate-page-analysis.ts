import type { PageElement, PageModel } from '../../shared/page-model';
import type { BrowserProfile } from '../../shared/profile';
import {
  semanticPlanSchema,
  type PageAnalysisModelOutput,
  type SemanticPlan,
} from '../../shared/semantic-analysis';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function keepNavigation(profile: BrowserProfile): boolean {
  return profile.learnedPreferences.some((preference) =>
    /\b(keep|show|preserve).{0,24}\bnavigation\b/i.test(preference),
  );
}

function canDeemphasize(
  element: PageElement,
  preserveNavigation: boolean,
): boolean {
  if (element.interactive || element.category === 'form') return false;
  if (
    element.landmark === 'main' ||
    element.role === 'dialog' ||
    element.tag === 'article' ||
    element.tag === 'main'
  ) {
    return false;
  }
  if (
    preserveNavigation &&
    (element.category === 'navigation' ||
      element.landmark === 'navigation')
  ) {
    return false;
  }
  return ['list', 'media', 'navigation', 'region'].includes(element.category);
}

function canCollapse(element: PageElement): boolean {
  return (
    !element.interactive &&
    (element.tag === 'aside' ||
      element.tag === 'footer' ||
      element.landmark === 'complementary' ||
      element.landmark === 'contentinfo')
  );
}

export function validatePageAnalysis(
  output: PageAnalysisModelOutput,
  page: PageModel,
  profile: BrowserProfile,
): SemanticPlan {
  const elements = new Map(
    page.elements.map((element) => [element.auraId, element]),
  );
  const preserveNavigation = keepNavigation(profile);
  const allowSemanticChanges = output.confidence >= 0.6;
  const primaryTargetIds = unique(
    output.primaryTargets
      .filter(
        (target) =>
          allowSemanticChanges &&
          target.confidence >= 0.45 &&
          elements.has(target.auraId),
      )
      .map((target) => target.auraId),
  );
  const primarySet = new Set(primaryTargetIds);
  const deemphasizeTargetIds: string[] = [];
  const collapseTargetIds: string[] = [];
  for (const target of output.secondaryTargets) {
    const element = elements.get(target.auraId);
    if (
      element === undefined ||
      !allowSemanticChanges ||
      primarySet.has(target.auraId) ||
      target.confidence < 0.62 ||
      !canDeemphasize(element, preserveNavigation)
    ) {
      continue;
    }
    if (
      target.action === 'collapse' &&
      target.confidence >= 0.82 &&
      profile.preferences.informationDensity !== 'standard' &&
      canCollapse(element)
    ) {
      collapseTargetIds.push(target.auraId);
    } else {
      deemphasizeTargetIds.push(target.auraId);
    }
  }
  const simplifications = output.simplifications.flatMap((recommendation) => {
    const element = elements.get(recommendation.auraId);
    if (
      element === undefined ||
      !allowSemanticChanges ||
      recommendation.confidence < 0.72 ||
      element.category !== 'text' ||
      element.interactive ||
      element.textLength < 80
    ) {
      return [];
    }
    return [
      {
        auraId: recommendation.auraId,
        simplifiedText: recommendation.simplifiedText,
      },
    ];
  });
  const guide =
    output.guide === null || !allowSemanticChanges
      ? null
      : {
          steps: output.guide.steps.filter((step) => {
            const element = elements.get(step.auraId);
            return (
              element !== undefined &&
              (element.interactive || element.category === 'heading')
            );
          }),
          title: output.guide.title,
        };

  return semanticPlanSchema.parse({
    collapseTargetIds: unique(collapseTargetIds),
    deemphasizeTargetIds: unique(deemphasizeTargetIds),
    guide:
      guide === null || guide.steps.length === 0 ? null : guide,
    highlightTargetIds: unique(
      output.highlights
        .filter(
          (target) =>
            allowSemanticChanges &&
            target.confidence >= 0.6 &&
            elements.has(target.auraId),
        )
        .map((target) => target.auraId),
    ),
    importantFacts: allowSemanticChanges
      ? output.importantFacts.filter(
          (fact) => fact.auraId === null || elements.has(fact.auraId),
        )
      : [],
    pageId: page.pageId,
    pagePurpose: output.pagePurpose,
    primaryTargetIds,
    revision: page.revision,
    simplifications,
    summary: output.summary,
  });
}
