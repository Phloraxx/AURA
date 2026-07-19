import {
  SEMANTIC_CONFIDENCE,
  semanticPageAnalysisSchema,
  type PageRepresentation,
  type SemanticPageAnalysis,
} from '@aura/shared';

export function validateSemanticAnalysisForPage(
  value: unknown,
  page: PageRepresentation,
): SemanticPageAnalysis {
  const analysis = semanticPageAnalysisSchema.parse(value);
  const pageIds = new Set(page.elements.map(({ id }) => id));
  const referenced = [
    ...analysis.mainContent,
    ...analysis.primaryActions,
    ...analysis.navigation,
    ...analysis.distractions,
    ...analysis.ambiguousControls,
    ...analysis.complexTextBlocks,
    ...analysis.formGroups,
  ];
  if (referenced.some(({ id }) => !pageIds.has(id))) {
    throw new Error('Semantic analysis referenced an unknown page element.');
  }

  const criticalIds = new Set(
    page.elements.filter(({ critical }) => critical).map(({ id }) => id),
  );
  return semanticPageAnalysisSchema.parse({
    ...analysis,
    mainContent: analysis.mainContent.filter(
      ({ confidence }) => confidence >= SEMANTIC_CONFIDENCE.mainContent,
    ),
    primaryActions: analysis.primaryActions.filter(
      ({ confidence }) => confidence >= SEMANTIC_CONFIDENCE.primaryAction,
    ),
    distractions: analysis.distractions.filter(
      ({ id, confidence }) =>
        confidence >= SEMANTIC_CONFIDENCE.distraction && !criticalIds.has(id),
    ),
    ambiguousControls: analysis.ambiguousControls.filter(
      ({ confidence }) => confidence >= SEMANTIC_CONFIDENCE.ambiguousControl,
    ),
    complexTextBlocks: analysis.complexTextBlocks.filter(
      ({ confidence }) => confidence >= SEMANTIC_CONFIDENCE.complexText,
    ),
    formGroups: analysis.formGroups.filter(
      ({ id, confidence }) =>
        confidence >= SEMANTIC_CONFIDENCE.formGroup && !criticalIds.has(id),
    ),
  });
}
