import {
  auraFitBreakdownSchema,
  type AuraFitBreakdown,
  type FrictionCategory,
  type PersonalizedFriction,
} from '@aura/shared';

import { relevantPersonalizedFriction } from './personalized-friction';

const CATEGORY_WEIGHTS: Record<FrictionCategory, number> = {
  readability: 1.1,
  interaction_target: 1.15,
  focus_navigation: 0.85,
  attention_clutter: 1,
  cognitive_workflow: 1.1,
  language_complexity: 0.95,
  motion: 0.65,
  control_clarity: 0.95,
  form_complexity: 1.05,
};

export function auraFitLabel(score: number): AuraFitBreakdown['label'] {
  if (score >= 85) return 'Strong fit';
  if (score >= 70) return 'Mostly comfortable';
  if (score >= 50) return 'Some friction';
  return 'Needs adaptation';
}

export function calculateAuraFit(
  personalized: readonly PersonalizedFriction[],
): AuraFitBreakdown {
  // AURA Fit is intentionally based only on deterministic local signals so a
  // before/after comparison always measures the page with the same instrument.
  // Irrelevant categories for the active profile are excluded rather than
  // diluting the score denominator. Semantic signals still power Lens and
  // explanations, but they are not mixed into the comparable score.
  const scorable = relevantPersonalizedFriction(personalized).filter(
    ({ signal }) => signal.source === 'local',
  );
  const byCategory = new Map<FrictionCategory, PersonalizedFriction[]>();
  for (const item of scorable) {
    const items = byCategory.get(item.signal.category) ?? [];
    items.push(item);
    byCategory.set(item.signal.category, items);
  }

  const categories = [...byCategory.entries()].map(([category, items]) => {
    const risk = 1 - items.reduce((remaining, item) => remaining * (1 - item.impact), 1);
    const strongest = [...items].sort((a, b) => b.impact - a.impact)[0];
    return {
      category,
      risk: Math.min(1, Math.max(0, risk)),
      signalCount: items.length,
      ...(strongest ? { topReason: strongest.signal.reason } : {}),
    };
  });

  let weightedRisk = 0;
  let totalWeight = 0;
  for (const category of categories) {
    const weight = CATEGORY_WEIGHTS[category.category];
    weightedRisk += category.risk * weight;
    totalWeight += weight;
  }
  const score = totalWeight === 0 ? 100 : Math.round(100 * (1 - weightedRisk / totalWeight));
  const clampedScore = Math.min(100, Math.max(0, score));
  const topFrictionIds = [...scorable]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 10)
    .map(({ signal }) => signal.id);

  return auraFitBreakdownSchema.parse({
    score: clampedScore,
    label: auraFitLabel(clampedScore),
    categories: categories.sort((a, b) => b.risk - a.risk),
    topFrictionIds,
    isHeuristic: true,
  });
}
