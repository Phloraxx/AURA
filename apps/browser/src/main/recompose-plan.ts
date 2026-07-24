import type { PageElement, PageModel } from '../shared/page-model';
import type { BrowserProfile } from '../shared/profile';
import {
  localRecomposeOutputSchema,
  recomposePlanSchema,
  type LocalRecomposeOutput,
  type RecomposeArchetype,
  type RecomposeItem,
  type RecomposePlan,
  type RecomposePreset,
  type RecomposeSection,
} from '../shared/recompose';
import type { SemanticPlan } from '../shared/semantic-analysis';

function cleanText(value: string | null | undefined, max = 220): string | null {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function elementLabel(element: PageElement): string | null {
  return cleanText(element.accessibleName ?? element.text, 160);
}

function inferArchetype(page: PageModel): RecomposeArchetype {
  const controls = page.elements.filter((element) => element.interactive && element.visible);
  const longText = page.elements.filter(
    (element) => element.visible && element.category === 'text' && element.textLength >= 220,
  );
  const hasArticle = page.regions.some(
    (region) => region.landmark === 'main' || region.tag === 'article' || region.role === 'article',
  );
  const repeated = page.repeatedStructures.find((item) => item.count >= 3);
  const formControls = page.forms.reduce((sum, form) => sum + form.totalControlCount, 0);

  if (page.forms.length > 0 && formControls >= 3) return 'form';
  if (repeated !== undefined && (controls.length >= 4 || repeated.count >= 4)) return 'listing';
  if (hasArticle && longText.length >= 2) return 'article';
  if (controls.length >= 14) return 'dashboard';
  if (controls.length >= 2 || page.elements.some((element) => element.category === 'media')) {
    return 'detail';
  }
  return 'general';
}

function actionForElement(element: PageElement, primary: boolean): RecomposeItem['action'] {
  if (!element.interactive) {
    return {
      auraId: element.auraId,
      behavior: 'scroll',
      label: 'Show on original page',
      prominence: primary ? 'primary' : 'secondary',
    };
  }
  const isFormControl =
    element.tag === 'input' ||
    element.tag === 'textarea' ||
    element.tag === 'select' ||
    element.role === 'textbox' ||
    element.role === 'combobox';
  return {
    auraId: element.auraId,
    behavior: isFormControl ? 'focus' : 'click',
    label: isFormControl
      ? `Use ${elementLabel(element) ?? 'this field'}`
      : elementLabel(element) ?? 'Open',
    prominence: primary ? 'primary' : 'secondary',
  };
}

function itemFromElement(
  element: PageElement,
  index: number,
  primary: boolean,
): RecomposeItem {
  const full = cleanText(element.text, 360);
  const name = elementLabel(element);
  const title = name ?? full ?? `${element.category} ${index + 1}`;
  const description = full !== null && full !== title ? full : null;
  const meta = [
    element.role && element.role !== element.tag ? element.role : null,
    element.href ? 'Link' : null,
    element.inputType ? `${element.inputType} field` : null,
  ].filter((value): value is string => value !== null);
  return {
    action: actionForElement(element, primary),
    description,
    id: `${element.auraId}-${index}`,
    meta: meta.slice(0, 4),
    targetAuraId: element.auraId,
    title,
  };
}

function uniqueElements(elements: PageElement[]): PageElement[] {
  const seen = new Set<string>();
  return elements.filter((element) => {
    if (seen.has(element.auraId)) return false;
    seen.add(element.auraId);
    return true;
  });
}

function byIds(page: PageModel, ids: string[]): PageElement[] {
  const map = new Map(page.elements.map((element) => [element.auraId, element]));
  return uniqueElements(
    ids
      .map((id) => map.get(id))
      .filter((element): element is PageElement => element !== undefined && element.visible),
  );
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

function primaryHeading(page: PageModel): string {
  const heading = ranked(page, (element) => element.category === 'heading', 1)[0];
  return elementLabel(heading ?? page.elements[0]!) ?? cleanText(page.title, 160) ?? 'This page';
}

function deterministicTargets(
  page: PageModel,
  archetype: RecomposeArchetype,
): {
  primary: PageElement[];
  results: PageElement[];
  supporting: PageElement[];
} {
  const primary = ranked(page, (element) => element.interactive, 6);
  let results: PageElement[] = [];
  if (archetype === 'listing') {
    const repeated = [...page.repeatedStructures]
      .sort((left, right) => right.count - left.count)[0];
    if (repeated !== undefined) {
      results = byIds(page, repeated.representativeAuraIds).slice(0, 8);
    }
    if (results.length < 3) {
      results = ranked(
        page,
        (element) =>
          element.repetitionKey !== null &&
          ['region', 'list', 'text', 'control'].includes(element.category),
        8,
      );
    }
  }
  if (archetype === 'form') {
    const firstForm = page.forms[0];
    results = firstForm ? byIds(page, firstForm.controlAuraIds).slice(0, 8) : primary;
  }
  const resultIds = new Set(results.map((item) => item.auraId));
  const primaryIds = new Set(primary.map((item) => item.auraId));
  const supporting = ranked(
    page,
    (element) =>
      !resultIds.has(element.auraId) &&
      !primaryIds.has(element.auraId) &&
      (element.category === 'text' || element.category === 'heading' || element.category === 'region'),
    10,
  );
  return { primary, results, supporting };
}

function section(
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
      itemFromElement(element, index, primaryIds.has(element.auraId)),
    ),
    kind,
    title,
  };
}

function orderSections(
  sections: RecomposeSection[],
  preferred: LocalRecomposeOutput['sectionOrder'] | null,
): RecomposeSection[] {
  if (preferred === null || preferred.length === 0) return sections;
  const weights = new Map(preferred.map((kind, index) => [kind, index]));
  return [...sections].sort((left, right) => {
    if (left.kind === 'hero') return -1;
    if (right.kind === 'hero') return 1;
    return (weights.get(left.kind) ?? 99) - (weights.get(right.kind) ?? 99);
  });
}

export function validateLocalRecomposeOutput(
  untrusted: unknown,
  page: PageModel,
): LocalRecomposeOutput | null {
  const parsed = localRecomposeOutputSchema.safeParse(untrusted);
  if (!parsed.success) return null;
  const validIds = new Set(page.elements.map((element) => element.auraId));
  const filter = (ids: string[]) => ids.filter((id) => validIds.has(id));
  return localRecomposeOutputSchema.parse({
    ...parsed.data,
    primaryTargetIds: filter(parsed.data.primaryTargetIds),
    resultTargetIds: filter(parsed.data.resultTargetIds),
    supportingTargetIds: filter(parsed.data.supportingTargetIds),
  });
}

export function buildRecomposePlan({
  currentGoal,
  local,
  page,
  preset,
  profile,
  source = local === null ? 'deterministic' : 'local',
}: {
  currentGoal: string | null;
  local: LocalRecomposeOutput | null;
  page: PageModel;
  preset: RecomposePreset;
  profile: BrowserProfile;
  source?: RecomposePlan['source'];
}): RecomposePlan {
  const archetype = local?.archetype ?? inferArchetype(page);
  const deterministic = deterministicTargets(page, archetype);
  const primary = local && local.primaryTargetIds.length > 0
    ? byIds(page, local.primaryTargetIds)
    : deterministic.primary;
  const results = local && local.resultTargetIds.length > 0
    ? byIds(page, local.resultTargetIds)
    : deterministic.results;
  const supporting = local && local.supportingTargetIds.length > 0
    ? byIds(page, local.supportingTargetIds)
    : deterministic.supporting;
  const primaryIds = new Set(primary.map((item) => item.auraId));
  const maxItems = preset === 'step_by_step' ? 4 : preset === 'clear_calm' ? 5 : 8;
  const sections: RecomposeSection[] = [];

  const actions = section(
    'actions',
    'actions',
    currentGoal ? 'Best next actions' : 'What you can do',
    primary.slice(0, preset === 'easy_to_control' ? 5 : 4),
    primaryIds,
  );
  if (actions) sections.push(actions);

  if (results.length > 0) {
    const resultSection = section(
      'results',
      'results',
      archetype === 'form' ? 'Complete these fields' : 'Best matches',
      results.slice(0, maxItems),
      primaryIds,
    );
    if (resultSection) sections.push(resultSection);
  }

  const content = section(
    'content',
    archetype === 'form' ? 'form' : 'content',
    archetype === 'article' ? 'What matters' : 'Useful information',
    supporting.slice(0, preset === 'clear_calm' || preset === 'step_by_step' ? 4 : 7),
    primaryIds,
  );
  if (content) sections.push(content);

  const ordered = orderSections(sections, local?.sectionOrder ?? null).slice(
    0,
    preset === 'clear_calm' || preset === 'step_by_step' ? 4 : 6,
  );
  const title = currentGoal ?? primaryHeading(page);
  const subtitle = currentGoal
    ? `AURA rebuilt ${cleanText(page.title, 90) ?? 'this page'} around this goal.`
    : preset === 'personalized'
      ? profile.summary || null
      : profile.summary;

  return recomposePlanSchema.parse({
    archetype,
    pageId: page.pageId,
    preset,
    revision: page.revision,
    sections: ordered.length > 0
      ? ordered
      : [
          {
            id: 'content',
            items: ranked(page, () => true, 5).map((element, index) =>
              itemFromElement(element, index, false),
            ),
            kind: 'content',
            title: 'This page',
          },
        ],
    source,
    subtitle,
    summary: local?.summary || null,
    title,
  });
}

export function refineRecomposeWithSemantic(
  plan: RecomposePlan,
  semantic: SemanticPlan,
): RecomposePlan {
  const prioritized = new Set([
    ...semantic.primaryTargetIds,
    ...semantic.highlightTargetIds,
  ]);
  const sections = plan.sections.map((item) => ({
    ...item,
    items: [...item.items].sort((left, right) => {
      const leftPrimary = left.targetAuraId !== null && prioritized.has(left.targetAuraId);
      const rightPrimary = right.targetAuraId !== null && prioritized.has(right.targetAuraId);
      return Number(rightPrimary) - Number(leftPrimary);
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
  if (semantic.guide !== null && semantic.guide.steps.length > 0) {
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
