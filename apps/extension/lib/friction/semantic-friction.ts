import type {
  FrictionSignal,
  PageRepresentation,
  SemanticPageAnalysis,
} from '@aura/shared';

function criticalIds(page: PageRepresentation): Set<string> {
  return new Set(page.elements.filter(({ critical }) => critical).map(({ id }) => id));
}

export function semanticFrictionSignals(
  analysis: SemanticPageAnalysis,
  page: PageRepresentation,
): FrictionSignal[] {
  const critical = criticalIds(page);
  const signals: FrictionSignal[] = [];
  analysis.distractions.forEach(({ id, confidence, reason }) => {
    signals.push({
      id: `semantic:attention:${id}`,
      category: 'attention_clutter',
      targetIds: [id],
      severity: 0.65,
      confidence,
      source: 'semantic_ai',
      reason,
      critical: critical.has(id),
    });
  });
  analysis.ambiguousControls.forEach(({ id, confidence, suggestedLabel }) => {
    signals.push({
      id: `semantic:clarity:${id}`,
      category: 'control_clarity',
      targetIds: [id],
      severity: 0.62,
      confidence,
      source: 'semantic_ai',
      reason: `This control may be clearer with a label such as “${suggestedLabel}”.`,
      critical: critical.has(id),
    });
  });
  analysis.complexTextBlocks.forEach(({ id, confidence, reason }) => {
    signals.push({
      id: `semantic:language:${id}`,
      category: 'language_complexity',
      targetIds: [id],
      severity: 0.58,
      confidence,
      source: 'semantic_ai',
      reason,
      critical: critical.has(id),
    });
  });
  analysis.formGroups.forEach(({ id, confidence, reason }) => {
    signals.push({
      id: `semantic:form:${id}`,
      category: 'form_complexity',
      targetIds: [id],
      severity: 0.6,
      confidence,
      source: 'semantic_ai',
      reason,
      critical: critical.has(id),
    });
  });
  return signals;
}
