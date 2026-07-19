import type {
  OnboardingResponse,
  PageElementRepresentation,
  SemanticPageAnalysis,
  SimplifyTextResponse,
  TaskPlanResponse,
} from '@aura/shared';

import type { LLMProvider } from './llm-provider.js';

const FOLLOW_UPS = [
  'Would larger text or stronger contrast make pages easier to read?',
  'Are small or tightly packed controls difficult to select comfortably?',
  'Would shorter steps make complex forms easier to follow?',
  'Does competing secondary content make it harder to focus?',
  'Would simpler wording or clearer control labels be useful?',
  'Would you like animation and motion reduced?',
  'Do you use a screen reader when browsing?',
  'Would hearing setup questions read aloud be useful?',
] as const;

export class MockLLMProvider implements LLMProvider {
  onboarding(input: Parameters<LLMProvider['onboarding']>[0]): Promise<OnboardingResponse> {
    const answeredCount = Math.min(input.askedAreas.length, FOLLOW_UPS.length);
    const onboardingComplete = answeredCount >= 5;
    const assistantMessage = onboardingComplete
      ? 'Thanks. Your preferences are ready for optional calibration and review.'
      : (FOLLOW_UPS[answeredCount] ?? FOLLOW_UPS.at(-1));

    if (!assistantMessage) throw new Error('Mock onboarding question is unavailable.');
    return Promise.resolve({
      assistantMessage,
      profilePatch: {},
      confidence: 0,
      suggestedCalibrationTask: onboardingComplete ? 'text_presentation' : null,
      onboardingComplete,
    });
  }

  analyzePage(input: Parameters<LLMProvider['analyzePage']>[0]): Promise<SemanticPageAnalysis> {
    const { elements, truncated } = input.page;
    const scored = (element: PageElementRepresentation, reason: string, confidence = 0.9) => ({
      id: element.id,
      confidence,
      reason,
    });
    const textFor = (element: PageElementRepresentation) =>
      `${element.accessibleName ?? ''} ${element.text ?? ''}`.trim();
    const main = elements.filter(
      ({ kind, tag, role }) =>
        kind === 'landmark' && (tag === 'main' || tag === 'article' || role === 'main'),
    );
    const primary = elements.filter(
      (element) =>
        element.kind === 'control' &&
        /\b(continue|submit|save|start|buy|add to cart|checkout|apply|confirm)\b/iu.test(
          textFor(element),
        ),
    );
    const distractions = elements.filter(
      (element) =>
        !element.critical &&
        (element.tag === 'aside' ||
          /\b(advertisement|sponsored|recommendations?|related content)\b/iu.test(
            textFor(element),
          )),
    );
    const formGroups = elements.filter(({ kind }) => kind === 'form_group');
    const logicalFormGroups = formGroups.some(({ tag }) => tag === 'fieldset')
      ? formGroups.filter(({ tag }) => tag === 'fieldset')
      : formGroups;

    return Promise.resolve({
      mainContent: main.slice(0, 3).map((element) => scored(element, 'Main page landmark', 0.98)),
      primaryActions: primary
        .slice(0, 5)
        .map((element) => scored(element, 'Action wording indicates a primary step', 0.85)),
      navigation: elements
        .filter(({ tag, role }) => tag === 'nav' || role === 'navigation')
        .slice(0, 10)
        .map((element) => scored(element, 'Navigation landmark', 0.98)),
      distractions: distractions
        .slice(0, 10)
        .map((element) => scored(element, 'Secondary or recommendation content', 0.9)),
      ambiguousControls: elements
        .filter(({ kind, accessibleName }) => kind === 'control' && !accessibleName)
        .slice(0, 10)
        .map((element) => ({
          ...scored(element, 'Control has no accessible name', 0.8),
          suggestedLabel: 'Unlabeled control',
        })),
      complexTextBlocks: elements
        .filter(({ kind, text }) => kind === 'text' && (text?.length ?? 0) > 250)
        .slice(0, 10)
        .map((element) => scored(element, 'Long text block may benefit from simplification', 0.75)),
      formGroups: logicalFormGroups
        .slice(0, 10)
        .map((element, index) =>
          scored(
            element,
            element.accessibleName || `Form section ${index + 1}`,
            0.9,
          ),
        ),
      warnings: truncated ? ['The compact page representation was truncated.'] : [],
    });
  }

  simplifyText(
    input: Parameters<LLMProvider['simplifyText']>[0],
  ): Promise<SimplifyTextResponse> {
    const highStakes =
      /\b(legal|medical|financial|payment|security|consent|warning|terms|obligation)\b/iu.test(
        input.text,
      );
    const sentences = input.text.match(/[^.!?]+[.!?]?/gu) ?? [input.text];
    const simplifiedText = sentences
      .map((sentence) => sentence.trim().replace(/\b(utilize|commence|subsequent to)\b/giu, (word) => {
        const replacements: Record<string, string> = {
          utilize: 'use',
          commence: 'start',
          'subsequent to': 'after',
        };
        return replacements[word.toLowerCase()] ?? word;
      }))
      .filter(Boolean)
      .join(' ')
      .slice(0, 4_000);
    return Promise.resolve({
      simplifiedText,
      requiresOriginal: highStakes,
      warnings: highStakes ? ['Keep the original available because this text may be high stakes.'] : [],
    });
  }

  planTask(input: Parameters<LLMProvider['planTask']>[0]): Promise<TaskPlanResponse> {
    const goal = input.goal.trim();
    const lower = goal.toLowerCase();
    const elements = input.page.elements;
    const textFor = (element: PageElementRepresentation) =>
      `${element.accessibleName ?? ''} ${element.text ?? ''}`.trim();
    const first = (...predicates: Array<(element: PageElementRepresentation) => boolean>) =>
      elements.find((element) => predicates.some((predicate) => predicate(element)));
    const controls = elements.filter(({ kind }) => kind === 'control');
    const main = first(
      (element) => element.kind === 'landmark' && (element.tag === 'main' || element.tag === 'article'),
    );
    const form = first((element) => element.kind === 'form_group' || element.tag === 'form');
    const applyControl = first((element) => /apply|continue|submit|start/iu.test(textFor(element)));
    const cartControl = first((element) => /cart|checkout|buy|purchase/iu.test(textFor(element)));
    const kind = /apply|job|application/iu.test(lower)
      ? 'apply'
      : /form|register|registration|complete/iu.test(lower)
        ? 'complete_form'
        : /checkout|purchase|buy|cart/iu.test(lower)
          ? 'purchase'
          : /read|article|content/iu.test(lower)
            ? 'read_content'
            : /compare/iu.test(lower)
              ? 'compare'
              : 'find_information';
    const steps = [] as TaskPlanResponse['steps'];
    if (main) {
      steps.push({
        id: 'task-step:review',
        label: 'Review the relevant page information',
        description: 'Read the main content before taking an important action.',
        targetIds: [main.id],
        optional: false,
        critical: false,
      });
    }
    if (form && (kind === 'apply' || kind === 'complete_form')) {
      steps.push({
        id: 'task-step:form',
        label: kind === 'apply' ? 'Complete the application details' : 'Complete the form sections',
        targetIds: [form.id],
        optional: false,
        critical: false,
      });
    }
    if (applyControl && (kind === 'apply' || kind === 'complete_form')) {
      steps.push({
        id: 'task-step:continue',
        label: 'Choose the next application step',
        targetIds: [applyControl.id],
        optional: false,
        critical: true,
      });
    }
    if (cartControl && kind === 'purchase') {
      steps.push({
        id: 'task-step:purchase',
        label: 'Review the purchase control',
        description: 'AURA will highlight it, but you must decide whether to activate it.',
        targetIds: [cartControl.id],
        optional: false,
        critical: true,
      });
    }
    if (steps.length === 0 && controls[0]) {
      steps.push({
        id: 'task-step:explore',
        label: 'Review the most relevant control',
        targetIds: [controls[0].id],
        optional: false,
        critical: Boolean(controls[0].critical),
      });
    }
    if (steps.length === 0 && main) {
      steps.push({
        id: 'task-step:main',
        label: 'Review the main content',
        targetIds: [main.id],
        optional: false,
        critical: false,
      });
    }
    return Promise.resolve({
      version: 1,
      task: {
        id: `task:${kind}`,
        label: goal,
        rawUserGoal: goal,
        kind,
      },
      steps: steps.slice(0, 12),
      warnings: [
        'AURA guides the original page controls. It does not submit forms, approve payments, or accept legal terms for you.',
      ],
    });
  }
}
