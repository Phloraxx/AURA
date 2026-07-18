import type {
  OnboardingResponse,
  PageElementRepresentation,
  SemanticPageAnalysis,
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
        /\b(continue|submit|save|start|buy|checkout|apply|confirm)\b/iu.test(textFor(element)),
    );
    const distractions = elements.filter(
      (element) =>
        !element.critical &&
        (element.tag === 'aside' ||
          /\b(advertisement|sponsored|recommendations?|related content)\b/iu.test(
            textFor(element),
          )),
    );
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
      formGroups: elements
        .filter(({ kind }) => kind === 'form_group')
        .slice(0, 10)
        .map((element) => scored(element, 'Form grouping', 0.9)),
      warnings: truncated ? ['The compact page representation was truncated.'] : [],
    });
  }
}
