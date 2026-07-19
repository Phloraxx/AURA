import {
  capabilityProfileSchema,
  createNeutralProfile,
  type AdaptationPreferencePatch,
  type CapabilityDimensions,
  type CapabilityProfile,
  type CapabilityProfilePatch,
  type OnboardingResponse,
} from '@aura/shared';

import {
  materializeResolvedProfile,
  resolveAdaptationPreferences,
  withPreferenceLayer,
} from '../profile/preference-resolver';

export type OnboardingMode = 'text' | 'choices' | 'voice' | 'quick';
export type QuestionAnswer = string;
export type CalibrationTask =
  | 'text_presentation'
  | 'control_size'
  | 'clutter_focus';

export interface OnboardingQuestion {
  area: keyof CapabilityDimensions | 'motion' | 'screen_reader' | 'speech_output';
  id: string;
  prompt: string;
  help: string;
}

export interface OnboardingState {
  mode: OnboardingMode;
  phase: 'questions' | 'calibration' | 'review';
  profile: CapabilityProfile;
  questionIndex: number;
  calibrationIndex: number;
  skippedQuestionIds: string[];
}

export const ONBOARDING_QUESTIONS: readonly OnboardingQuestion[] = [
  {
    id: 'visual-presentation',
    area: 'visual',
    prompt: 'Would larger text or stronger contrast make pages easier to read?',
    help: 'You can change the exact size and colors later.',
  },
  {
    id: 'motor-controls',
    area: 'motor',
    prompt: 'Are small buttons or tightly packed controls difficult to select comfortably?',
    help: 'This can apply to a pointer, touch, switch, or keyboard use.',
  },
  {
    id: 'cognitive-workflows',
    area: 'cognitive',
    prompt: 'Would shorter steps make complex forms or instructions easier to follow?',
    help: 'AURA can prefer smaller, clearer chunks without removing information.',
  },
  {
    id: 'attention-clutter',
    area: 'attention',
    prompt: 'Does competing content such as sidebars and recommendations make it harder to focus?',
    help: 'Secondary content always remains available to restore.',
  },
  {
    id: 'language-complexity',
    area: 'language',
    prompt: 'Would simpler wording and clearer control labels be useful?',
    help: 'Original wording remains available, especially for important information.',
  },
  {
    id: 'motion',
    area: 'motion',
    prompt: 'Would you like animation and motion reduced?',
    help: 'This limits non-essential animation and fast transitions.',
  },
  {
    id: 'screen-reader',
    area: 'screen_reader',
    prompt: 'Do you use a screen reader when browsing?',
    help: 'AURA will preserve semantic structure and avoid unnecessary visual-only questions.',
  },
  {
    id: 'output-support',
    area: 'speech_output',
    prompt: 'Would hearing setup questions read aloud be useful?',
    help: 'Speech is optional and visible text always remains on screen.',
  },
] as const;

export const CALIBRATION_TASKS: readonly CalibrationTask[] = [
  'text_presentation',
  'control_size',
  'clutter_focus',
] as const;

function selfReportedDimension(
  profile: CapabilityProfile,
  name: keyof CapabilityDimensions,
  needsSupport: boolean,
): CapabilityDimensions {
  return {
    ...profile.dimensions,
    [name]: {
      capacity: needsSupport ? 0.55 : 1,
      confidence: 0.8,
      sources: ['self_report'],
    },
  };
}

function resolveBinaryAnswer(answer: QuestionAnswer): boolean | undefined {
  if (answer === 'yes') return true;
  if (answer === 'no') return false;
  if (answer === 'skip' || answer === 'unsure') return undefined;
  const normalized = answer.trim().toLowerCase();
  if (/\b(no|not really|comfortable|fine as is)\b/u.test(normalized)) return false;
  if (/\b(yes|help|hard|difficult|larger|reduce|simpler|useful|please)\b/u.test(normalized)) {
    return true;
  }
  return undefined;
}

function patchForQuestion(
  profile: CapabilityProfile,
  question: OnboardingQuestion,
  answer: QuestionAnswer,
): CapabilityProfile {
  const affirmative = resolveBinaryAnswer(answer);
  if (affirmative === undefined) return profile;
  const preferencePatch: AdaptationPreferencePatch = {};
  let dimensions = profile.dimensions;
  let modalities = profile.modalities;

  switch (question.area) {
    case 'visual':
      dimensions = selfReportedDimension(profile, 'visual', affirmative);
      preferencePatch.textScale = affirmative ? 1.3 : 1;
      preferencePatch.contrast = affirmative ? 'enhanced' : 'default';
      break;
    case 'motor':
      dimensions = selfReportedDimension(profile, 'motor', affirmative);
      preferencePatch.enlargeTargets = affirmative;
      preferencePatch.targetSizePx = affirmative ? 52 : 44;
      break;
    case 'cognitive':
      dimensions = selfReportedDimension(profile, 'cognitive', affirmative);
      preferencePatch.stepByStepForms = affirmative;
      break;
    case 'attention':
      dimensions = selfReportedDimension(profile, 'attention', affirmative);
      preferencePatch.focusMode = affirmative;
      preferencePatch.hideDistractions = affirmative;
      break;
    case 'language':
      dimensions = selfReportedDimension(profile, 'language', affirmative);
      preferencePatch.simplifyLanguage = affirmative;
      preferencePatch.clarifyControls = affirmative;
      break;
    case 'motion':
      preferencePatch.reduceMotion = affirmative;
      break;
    case 'screen_reader':
      modalities = { ...modalities, screenReader: affirmative };
      break;
    case 'speech_output':
      modalities = {
        ...modalities,
        preferredOutput: affirmative ? ['visual', 'speech'] : ['visual'],
      };
      break;
  }

  const base = capabilityProfileSchema.parse({ ...profile, dimensions, modalities });
  return Object.keys(preferencePatch).length > 0
    ? withPreferenceLayer(base, 'onboarding', preferencePatch)
    : materializeResolvedProfile(base);
}

export function startOnboarding(mode: OnboardingMode): OnboardingState {
  return {
    mode,
    phase: mode === 'quick' ? 'calibration' : 'questions',
    profile: createNeutralProfile({ name: 'My AURA profile' }),
    questionIndex: 0,
    calibrationIndex: 0,
    skippedQuestionIds: [],
  };
}

export function answerCurrentQuestion(
  state: OnboardingState,
  answer: QuestionAnswer,
): OnboardingState {
  if (state.phase !== 'questions') return state;
  const question = ONBOARDING_QUESTIONS[state.questionIndex];
  if (!question) return { ...state, phase: 'calibration' };
  const nextIndex = state.questionIndex + 1;

  return {
    ...state,
    profile: patchForQuestion(state.profile, question, answer),
    questionIndex: nextIndex,
    phase: nextIndex >= ONBOARDING_QUESTIONS.length ? 'calibration' : 'questions',
    skippedQuestionIds:
      answer === 'skip'
        ? [...state.skippedQuestionIds, question.id]
        : state.skippedQuestionIds,
  };
}

export function mergeProfilePatch(
  profile: CapabilityProfile,
  patch: CapabilityProfilePatch,
): CapabilityProfile {
  const base = capabilityProfileSchema.parse({
    ...profile,
    dimensions: { ...profile.dimensions, ...patch.dimensions },
    modalities: { ...profile.modalities, ...patch.modalities },
  });
  return patch.preferences
    ? withPreferenceLayer(base, 'onboarding', patch.preferences)
    : materializeResolvedProfile(base);
}

export function applyProviderResponse(
  state: OnboardingState,
  response: OnboardingResponse,
  answer: string,
): OnboardingState {
  if (state.phase !== 'questions') return state;
  const question = ONBOARDING_QUESTIONS[state.questionIndex];
  const nextIndex = state.questionIndex + 1;
  const enoughQuestions = nextIndex >= 5;
  const finished =
    nextIndex >= ONBOARDING_QUESTIONS.length ||
    (enoughQuestions && response.onboardingComplete);

  return {
    ...state,
    profile: mergeProfilePatch(
      question ? patchForQuestion(state.profile, question, answer) : state.profile,
      response.profilePatch,
    ),
    questionIndex: nextIndex,
    phase: finished ? 'calibration' : 'questions',
    skippedQuestionIds:
      answer === 'skip' && question
        ? [...state.skippedQuestionIds, question.id]
        : state.skippedQuestionIds,
  };
}

function addCalibrationEvidence(
  profile: CapabilityProfile,
  name: keyof CapabilityDimensions,
): CapabilityDimensions {
  const current = profile.dimensions[name];
  return {
    ...profile.dimensions,
    [name]: {
      capacity: Math.min(current.capacity, 0.8),
      confidence: Math.max(current.confidence, 0.3),
      sources: [...new Set([...current.sources, 'calibration' as const])],
    },
  };
}

export function applyCalibrationChoice(
  state: OnboardingState,
  choice: string,
): OnboardingState {
  if (state.phase !== 'calibration') return state;
  const task = CALIBRATION_TASKS[state.calibrationIndex];
  if (!task) return { ...state, phase: 'review' };
  let profile = state.profile;
  let preferencePatch: AdaptationPreferencePatch = {};

  if (choice !== 'skip') {
    if (task === 'text_presentation') {
      const presentation = {
        comfortable: { textScale: 1, lineSpacing: 1, readingWidth: 'normal' },
        spacious: { textScale: 1.25, lineSpacing: 1.4, readingWidth: 'narrow' },
        largest: { textScale: 1.5, lineSpacing: 1.6, readingWidth: 'very_narrow' },
      } as const;
      const selected = presentation[choice as keyof typeof presentation];
      if (selected) {
        profile = capabilityProfileSchema.parse({
          ...profile,
          dimensions: addCalibrationEvidence(profile, 'visual'),
        });
        preferencePatch = selected;
      }
    } else if (task === 'control_size') {
      const sizes = { standard: 44, large: 52, largest: 60 } as const;
      const selected = sizes[choice as keyof typeof sizes];
      if (selected) {
        profile = capabilityProfileSchema.parse({
          ...profile,
          dimensions: addCalibrationEvidence(profile, 'motor'),
        });
        preferencePatch = {
          enlargeTargets: selected > 44,
          targetSizePx: selected,
        };
      }
    } else if (task === 'clutter_focus' && (choice === 'dense' || choice === 'focused')) {
      const focused = choice === 'focused';
      profile = capabilityProfileSchema.parse({
        ...profile,
        dimensions: addCalibrationEvidence(profile, 'attention'),
      });
      preferencePatch = {
        focusMode: focused,
        hideDistractions: focused,
      };
    }
  }

  if (Object.keys(preferencePatch).length > 0) {
    profile = withPreferenceLayer(profile, 'calibration', preferencePatch);
  } else {
    profile = materializeResolvedProfile(profile);
  }

  const nextIndex = state.calibrationIndex + 1;
  return {
    ...state,
    profile,
    calibrationIndex: nextIndex,
    phase: nextIndex >= CALIBRATION_TASKS.length ? 'review' : 'calibration',
  };
}

export function profileSummary(profile: CapabilityProfile): string[] {
  const preferences = resolveAdaptationPreferences(profile).preferences;
  const items: string[] = [];
  if (preferences.textScale > 1) items.push('make text larger');
  if (preferences.enlargeTargets) items.push('make controls easier to select');
  if (preferences.reduceMotion) items.push('reduce animation and motion');
  if (preferences.focusMode) items.push('focus on primary content');
  if (preferences.hideDistractions) items.push('collapse distracting secondary content');
  if (preferences.simplifyLanguage) items.push('offer simpler wording');
  if (preferences.clarifyControls) items.push('clarify ambiguous controls');
  if (preferences.stepByStepForms) items.push('guide complex forms in smaller steps');
  return items.length > 0 ? items : ['keep pages close to their original presentation'];
}
