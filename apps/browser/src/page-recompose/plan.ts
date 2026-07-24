import type { PageElement, PageModel } from '../shared/page-model';
import {
  recomposePlanSchema,
  type LocalRecomposeOutput,
  type RecomposeArchetype,
  type RecomposeItem,
  type RecomposePlan,
  type RecomposePreset,
  type RecomposeSection,
} from '../shared/recompose';
import type { SemanticPlan } from '../shared/semantic-analysis';

function clean(value: string | null | undefined, max = 260): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function label(element: PageElement): string | null {
  return clean(element.accessibleName ?? element.text, 160);
}

function inferArchetype(page: PageModel): RecomposeArchetype {
  const visible = page.elements.filter((element) => element.visible);
  const interactive = visible.filter((element) => element.interactive);
  const longText = visible.filter(
    (element) => element.category === 'text' && element.textLength >= 220,
  );
  const mainLike = page.regions.some(
    (region) =>
      region.landmark === 'main' || region.tag === 'article' || region.role === 'article',
  );
  const repeated = page.repeatedStructures.some((item) => item.count >= 3);
  const formControls = page.forms.reduce(
    (total, form) => total + form.totalControlCount,
    0,
  );

  if (page.forms.length > 0 && formControls >= 3) return 'form';
  if (repeated && interactive.length >= 4) return 'listing';
  if (mainLike && longText.length >= 2) return 'article';
  if (interactive.length >= 14) return 'dashboard';
  if (interactive.length >= 2) return 'detail';
  return 'general';
}

function ranked(
  page: PageModel,
  predicate: (element: PageElement) => boolean,
  limit: number,
): PageElement[] {
  return page.elements
    .filter((element) => element.visible && predicate(element))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function byIds(page: PageModel, ids: string[]): PageElement[] {
  const map = new Map(page.elements.map((element) => [element.auraId, element]));
  const seen = new Set<string>();
  return ids
    .map((id) => map.get(id))
    .filter((element): element is PageElement => {
      if (element === undefined || !element.visible || seen.has(element.auraId)) {
        return false;
      }
      seen.add(element.auraId);
      return true;
    });
}

function actionFor(element: PageElement, primary: boolean): RecomposeItem['action'] {
  if (!element.interactive) {
    return {
      auraId: element.auraId,
      behavior: 'scroll',
      label: 'Show on original page',
      prominence: 'secondary',
    };
  }
  const field =
    element.tag === 'input' ||
    element.tag === 'textarea' ||
    element.tag === 'select' ||
    element.role === 'textbox' ||
    element.role === 'combobox';
  return {
    auraId: element.auraId,
    behavior: field ? 'focus' : 'click',
    label: field
      ? `Use ${label(element) ?? 'this field'}`
      : label(element) ?? 'Open',
    prominence: primary ? 'primary' : 'secondary',
  };
}

function itemFrom(element: PageElement, index: number, primary: boolean): RecomposeItem {
  const full = clean(element.text, 360);
  const title = label(element) ?? full ?? `Item ${index + 1}`;
  const meta = [
    element.inputType ? `${element.inputType} field` : null,
    element.href ? 'Link' : null,
  ].filter((item): item is string => item !== null);
  return {
    action: actionFor(element, primary),
    description: full !== null && full !== title ? full : null,
    id: `${element.auraId}-${index}`,
    meta,
    targetAuraId: element.auraId,
    title,
  };
}

function makeSection(
  id: string,
  kind: RecomposeSection['kind'],
  title: string,
  elements: PageElement[],
  primaryIds: Set<string>,
): RecomposeSection | null {
  if (elements.length === 0) return null;
  return {
    id,
    items: elements.map((element, index) =>
      itemFrom(element, index, primaryIds.has(element.auraId)),
    ),
    kind,
    title,
  };
}

function pageHeading(page: PageModel): string {
  const heading = ranked(page, (element) => element.category === 'heading', 1)[0];
  return label(heading ?? page.elements[0]!) ?? clean(page.title, 160) ?? 'This page';
}

function deterministicTargets(page: PageModel, archetype: RecomposeArchetype) {
  const primary = ranked(page, (element) => element.interactive, 6);
  let results: PageElement[] = [];
  if (archetype === 'listing') {
    const repeated = [...page.repeatedStructures].sort(
      (left, right) => right.count - left.count,
    )[0];
    if (repeated !== undefined) {
      results = byIds(page, repeated.representativeAuraIds).slice(0, 8);
    }
    if (results.length < 3) {
      results = ranked(
        page,
        (element) => element.repetitionKey !== null,
        8,
      );
    }
  } else if (archetype === 'form') {
    results = page.forms[0]
      ? byIds(page, page.forms[0].controlAuraIds).slice(0, 8)
      : primary;
  }

  const used = new Set([...primary, ...results].map((element) => element.auraId));
  const supporting = ranked(
    page,
    (element) =>
      !used.has(element.auraId) &&
      ['heading', 'text', 'region'].includes(element.category),
    10,
  );
  return { primary, results, supporting };
}

function reorder(
  sections: RecomposeSection[],
  preferred: LocalRecomposeOutput['sectionOrder'] | null,
): RecomposeSection[] {
  if (!preferred?.length) return sections;
  const rank = new Map(preferred.map((kind, index) => [kind, index]));
  return [...sections].sort(
    (left, right) => (rank.get(left.kind) ?? 99) - (rank.get(right.kind) ?? 99),
  );
}

export function buildPageRecomposePlan({
  currentGoal = null,
  local = null,
  page,
  preset,
  source = local === null ? 'deterministic' : 'local',
  subtitle = null,
}: {
  currentGoal?: string | null;
  local?: LocalRecomposeOutput | null;
  page: PageModel;
  preset: RecomposePreset;
  source?: RecomposePlan['source'];
  subtitle?: string | null;
}): RecomposePlan {
  const archetype = local?.archetype ?? inferArchetype(page);
  const fallback = deterministicTargets(page, archetype);
  const primary = local?.primaryTargetIds.length
    ? byIds(page, local.primaryTargetIds)
    : fallback.primary;
  const results = local?.resultTargetIds.length
    ? byIds(page, local.resultTargetIds)
    : fallback.results;
  const supporting = local?.supportingTargetIds.length
    ? byIds(page, local.supportingTargetIds)
    : fallback.supporting;
  const primaryIds = new Set(primary.map((element) => element.auraId));
  const maxItems = preset === 'step_by_step' ? 4 : preset === 'clear_calm' ? 5 : 8;
  const sections: RecomposeSection[] = [];

  const actions = makeSection(
    'actions',
    'actions',
    currentGoal ? 'Best next actions' : 'What you can do',
    primary.slice(0, preset === 'easy_to_control' ? 5 : 4),
    primaryIds,
  );
  if (actions) sections.push(actions);

  if (results.length > 0) {
    const resultSection = makeSection(
      'results',
      archetype === 'form' ? 'form' : 'results',
      archetype === 'form' ? 'Complete these fields' : 'Best matches',
      results.slice(0, maxItems),
      primaryIds,
    );
    if (resultSection) sections.push(resultSection);
  }

  const content = makeSection(
    'content',
    'content',
    archetype === 'article' ? 'What matters' : 'Useful information',
    supporting.slice(0, preset === 'clear_calm' || preset === 'step_by_step' ? 4 : 7),
    primaryIds,
  );
  if (content) sections.push(content);

  const ordered = reorder(sections, local?.sectionOrder ?? null).slice(
    0,
    preset === 'clear_calm' || preset === 'step_by_step' ? 4 : 6,
  );

  return recomposePlanSchema.parse({
    archetype,
    pageId: page.pageId,
    preset,
    revision: page.revision,
    sections:
      ordered.length > 0
        ? ordered
        : [
            {
              id: 'content',
              items: ranked(page, () => true, 5).map((element, index) =>
                itemFrom(element, index, false),
              ),
              kind: 'content',
              title: 'This page',
            },
          ],
    source,
    subtitle,
    summary: local?.summary || null,
    title: currentGoal ?? pageHeading(page),
  });
}

export function refinePageRecomposeWithSemantic(
  plan: RecomposePlan,
  semantic: SemanticPlan,
): RecomposePlan {
  const important = new Set([
    ...semantic.primaryTargetIds,
    ...semantic.highlightTargetIds,
  ]);
  const sections = plan.sections.map((section) => ({
    ...section,
    items: [...section.items].sort((left, right) => {
      const leftImportant = left.targetAuraId !== null && important.has(left.targetAuraId);
      const rightImportant = right.targetAuraId !== null && important.has(right.targetAuraId);
      return Number(rightImportant) - Number(leftImportant);
    }),
  }));

  if (semantic.importantFacts.length > 0) {
    sections.splice(Math.min(1, sections.length), 0, {
      id: 'facts',
      items: semantic.importantFacts.map((fact, index) => ({
        action:
          fact.auraId === null
            ? null
            : {
                auraId: fact.auraId,
                behavior: 'scroll' as const,
                label: 'Show source',
                prominence: 'secondary' as const,
              },
        description: fact.value,
        id: `fact-${index}`,
        meta: [],
        targetAuraId: fact.auraId,
        title: fact.label,
      })),
      kind: 'facts',
      title: 'What matters',
    });
  }

  if (semantic.guide?.steps.length) {
    sections.unshift({
      id: 'guide',
      items: semantic.guide.steps.map((step, index) => ({
        action: {
          auraId: step.auraId,
          behavior: 'focus' as const,
          label: index === 0 ? 'Start here' : `Go to step ${index + 1}`,
          prominence: index === 0 ? ('primary' as const) : ('secondary' as const),
        },
        description: null,
        id: `guide-${index}`,
        meta: [`Step ${index + 1} of ${semantic.guide!.steps.length}`],
        targetAuraId: step.auraId,
        title: step.instruction,
      })),
      kind: 'actions',
      title: semantic.guide.title,
    });
  }

  return recomposePlanSchema.parse({
    ...plan,
    sections: sections.slice(0, 8),
    source: 'cloud',
    summary: semantic.summary,
    title: semantic.pagePurpose || plan.title,
  });
}

export function inferPresetFromSettings(settings: {
  informationDensity: 'standard' | 'calm' | 'step_by_step';
  reduceMotion: boolean;
  targetSizePx: number;
  textScale: number;
}): RecomposePreset {
  if (settings.informationDensity === 'step_by_step') return 'step_by_step';
  if (settings.targetSizePx >= 60 && settings.textScale >= 1.3) return 'easier_to_see';
  if (settings.targetSizePx >= 60) return 'easy_to_control';
  if (settings.informationDensity === 'calm' && settings.reduceMotion) return 'clear_calm';
  return 'personalized';
}
