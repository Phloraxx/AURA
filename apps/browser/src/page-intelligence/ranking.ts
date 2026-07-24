import type {
  ExtractionHealth,
  PageElement,
  PageElementCategory,
  RepeatedStructureSummary,
} from '../shared/page-model';

export interface RankablePageElement extends PageElement {
  insidePrimaryContent: boolean;
  insideUtilityRegion: boolean;
  sourceOrder: number;
  visualProminence: number;
}

const CATEGORY_QUOTAS: Record<PageElementCategory, number> = {
  control: 48,
  form: 10,
  heading: 24,
  list: 10,
  media: 8,
  navigation: 12,
  region: 20,
  table: 8,
  text: 40,
};

const MAX_REPRESENTATIVES_PER_PATTERN = 3;

function normalizeFingerprintValue(value: string | null): string {
  return (value ?? '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function fingerprint(element: RankablePageElement): string {
  let href = '';
  if (element.href !== null) {
    try {
      href = new URL(element.href).pathname;
    } catch {
      href = element.href;
    }
  }
  return [
    element.category,
    element.role,
    element.tag,
    normalizeFingerprintValue(element.accessibleName),
    normalizeFingerprintValue(element.text).slice(0, 160),
    href,
  ].join('|');
}

function compareElements(
  first: RankablePageElement,
  second: RankablePageElement,
): number {
  return second.score - first.score || first.sourceOrder - second.sourceOrder;
}

export function scoreElement(element: RankablePageElement): number {
  let score = 0;

  if (element.insidePrimaryContent) score += 50;
  if (element.interactive && element.category === 'control') score += 45;
  if (element.category === 'heading') score += 40;
  if (element.inViewport) score += 30;
  if (element.interactive && element.accessibleName !== null) score += 30;
  if (element.category === 'region') score += 25;
  if (element.category === 'text' && element.textLength >= 80) score += 20;
  if (element.formAuraId !== null) score += 20;
  score += Math.min(15, Math.round(element.visualProminence * 15));
  if (element.rect !== null && element.rect.width * element.rect.height > 60_000) {
    score += 10;
  }

  if (element.repetitionKey !== null) score -= 20;
  if (element.insideUtilityRegion && !element.inViewport) score -= 25;
  if (
    element.rect !== null &&
    element.rect.width * element.rect.height < 100 &&
    !element.interactive
  ) {
    score -= 30;
  }

  return score;
}

export function summarizeRepeatedStructures(
  elements: RankablePageElement[],
): RepeatedStructureSummary[] {
  const groups = new Map<string, RankablePageElement[]>();

  for (const element of elements) {
    if (element.repetitionKey === null) continue;
    const group = groups.get(element.repetitionKey) ?? [];
    group.push(element);
    groups.set(element.repetitionKey, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length >= 3)
    .map(([key, group]) => {
      const ranked = [...group].sort(compareElements);
      return {
        category: ranked[0]?.category ?? 'text',
        count: group.length,
        exampleNames: ranked
          .map((element) => element.accessibleName ?? element.text)
          .filter((value): value is string => value !== null && value.length > 0)
          .slice(0, MAX_REPRESENTATIVES_PER_PATTERN),
        key,
        representativeAuraIds: ranked
          .slice(0, MAX_REPRESENTATIVES_PER_PATTERN)
          .map((element) => element.auraId),
      };
    })
    .sort((first, second) => second.count - first.count);
}

export function selectBalancedElements(
  input: RankablePageElement[],
  maximum = 180,
): PageElement[] {
  const bestByFingerprint = new Map<string, RankablePageElement>();

  for (const element of input) {
    const ranked = { ...element, score: scoreElement(element) };
    const key = fingerprint(ranked);
    const existing = bestByFingerprint.get(key);
    if (existing === undefined || compareElements(ranked, existing) < 0) {
      bestByFingerprint.set(key, ranked);
    }
  }

  const candidates = [...bestByFingerprint.values()].sort(compareElements);
  const selected = new Map<string, RankablePageElement>();
  const repetitionCounts = new Map<string, number>();

  function canSelect(element: RankablePageElement): boolean {
    if (element.repetitionKey === null) return true;
    return (
      (repetitionCounts.get(element.repetitionKey) ?? 0) <
      MAX_REPRESENTATIVES_PER_PATTERN
    );
  }

  function add(element: RankablePageElement): void {
    if (selected.has(element.auraId) || !canSelect(element)) return;
    selected.set(element.auraId, element);
    if (element.repetitionKey !== null) {
      repetitionCounts.set(
        element.repetitionKey,
        (repetitionCounts.get(element.repetitionKey) ?? 0) + 1,
      );
    }
  }

  for (const category of Object.keys(CATEGORY_QUOTAS) as PageElementCategory[]) {
    const quota = Math.min(CATEGORY_QUOTAS[category], maximum - selected.size);
    const categoryCandidates = candidates.filter(
      (candidate) => candidate.category === category,
    );
    for (const candidate of categoryCandidates) {
      if (selected.size >= maximum || quota <= 0) break;
      const previousCount = [...selected.values()].filter(
        (element) => element.category === category,
      ).length;
      if (previousCount >= quota) break;
      add(candidate);
    }
  }

  for (const candidate of candidates) {
    if (selected.size >= maximum) break;
    add(candidate);
  }

  return [...selected.values()].sort(compareElements).map((candidate) => {
    const element: PageElement = { ...candidate };
    delete (element as Partial<RankablePageElement>).insidePrimaryContent;
    delete (element as Partial<RankablePageElement>).insideUtilityRegion;
    delete (element as Partial<RankablePageElement>).sourceOrder;
    delete (element as Partial<RankablePageElement>).visualProminence;
    return element;
  });
}

export function calculateExtractionHealth(
  elements: PageElement[],
): ExtractionHealth {
  const forms = elements.filter((element) => element.category === 'form');
  const formControls = elements.filter(
    (element) => element.formAuraId !== null && element.interactive,
  );
  const labeledFormControls = formControls.filter(
    (element) => element.accessibleName !== null,
  );
  const formLabelCoverage =
    formControls.length === 0
      ? forms.length === 0
        ? 1
        : 0
      : labeledFormControls.length / formControls.length;

  const enoughTargets = elements.length >= 8;
  const hasPrimaryRegion = elements.some(
    (element) =>
      element.landmark === 'main' ||
      element.tag === 'main' ||
      element.tag === 'article',
  );
  const hasHeading = elements.some(
    (element) => element.category === 'heading',
  );
  const hasInteractive = elements.some((element) => element.interactive);

  const checks = [
    enoughTargets,
    hasPrimaryRegion,
    hasHeading,
    hasInteractive,
    formLabelCoverage >= 0.75,
  ];

  return {
    enoughTargets,
    formLabelCoverage: Math.round(formLabelCoverage * 100) / 100,
    hasHeading,
    hasInteractive,
    hasPrimaryRegion,
    score:
      Math.round(
        (checks.filter(Boolean).length / checks.length) * 100,
      ) / 100,
  };
}
