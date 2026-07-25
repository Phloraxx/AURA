import { z } from 'zod';

export const supportLevelSchema = z.enum(['default', 'helpful', 'important']);
export const functionalAreaSchema = z.enum([
  'visual',
  'auditory',
  'motor',
  'cognitive',
  'attention',
  'language',
]);
export const functionalDifficultySchema = z.enum([
  'no_difficulty',
  'some_difficulty',
  'a_lot_of_difficulty',
  'cannot_reliably',
  'not_sure',
]);
export const functionalAnswerSchema = z.object({
  area: functionalAreaSchema,
  difficulty: functionalDifficultySchema,
});

export const browserProfileSchema = z.object({
  capabilities: z.object({
    attention: supportLevelSchema,
    auditory: supportLevelSchema,
    cognitive: supportLevelSchema,
    language: supportLevelSchema,
    motor: supportLevelSchema,
    visual: supportLevelSchema,
  }),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  id: z.string().min(1),
  functionalAnswers: z.array(functionalAnswerSchema).max(6).default([]),
  learnedPreferences: z.array(z.string().trim().min(1).max(300)).max(20),
  preferences: z.object({
    explanationStyle: z.enum(['concise', 'balanced', 'detailed']),
    informationDensity: z.enum(['standard', 'calm', 'step_by_step']),
    lineSpacing: z.number().min(1).max(2),
    preserveTechnicalTerms: z.boolean(),
    readingWidth: z.enum(['normal', 'narrow']),
    reduceMotion: z.boolean(),
    strongFocus: z.boolean(),
    targetSizePx: z.number().int().min(44).max(60),
    textScale: z.number().min(1).max(1.5),
  }),
  summary: z.string(),
  updatedAt: z.string(),
  version: z.literal(1),
});

export const calibrationChoiceSchema = z.discriminatedUnion('area', [
  z.object({
    area: z.literal('reading'),
    choice: z.enum(['standard', 'comfortable', 'largest']),
  }),
  z.object({
    area: z.literal('interaction'),
    choice: z.enum(['standard', 'comfortable', 'largest']),
  }),
  z.object({
    area: z.literal('attention'),
    choice: z.enum(['standard', 'calm', 'step_by_step']),
  }),
  z.object({
    area: z.literal('understanding'),
    choice: z.enum(['concise', 'balanced', 'detailed']),
    preserveTechnicalTerms: z.boolean(),
  }),
]);

export const onboardingTurnRequestSchema = z.object({
  answers: z.array(functionalAnswerSchema).max(6).default([]),
  choices: z.array(calibrationChoiceSchema).default([]),
  userResponse: z.string().trim().max(1_000).default(''),
});

export const onboardingQuestionSchema = z.object({
  area: functionalAreaSchema,
  helpText: z.string().trim().min(1).max(220),
  prompt: z.string().trim().min(1).max(240),
});

export const onboardingTurnResponseSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(600),
  complete: z.boolean(),
  confidence: z.number().min(0).max(1),
  learnedPreference: z.string().trim().max(300).nullable(),
  mascotMood: z.enum([
    'welcoming',
    'asking',
    'listening',
    'thinking',
    'celebrating',
    'attention',
  ]),
  nextQuestion: onboardingQuestionSchema.nullable(),
  source: z.enum(['ai', 'fallback']),
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    })
    .nullable(),
});

export const onboardingModelOutputSchema = onboardingTurnResponseSchema.omit({
  source: true,
  usage: true,
});

export type BrowserProfile = z.infer<typeof browserProfileSchema>;
export type CalibrationChoice = z.infer<typeof calibrationChoiceSchema>;
export type FunctionalAnswer = z.infer<typeof functionalAnswerSchema>;
export type FunctionalArea = z.infer<typeof functionalAreaSchema>;
export type FunctionalDifficulty = z.infer<typeof functionalDifficultySchema>;
export type OnboardingTurnRequest = z.input<
  typeof onboardingTurnRequestSchema
>;
export type OnboardingTurnResponse = z.infer<
  typeof onboardingTurnResponseSchema
>;
export type OnboardingModelOutput = z.infer<
  typeof onboardingModelOutputSchema
>;

export function createDefaultBrowserProfile(
  now = new Date().toISOString(),
  id: string = globalThis.crypto.randomUUID(),
): BrowserProfile {
  return browserProfileSchema.parse({
    capabilities: {
      attention: 'default',
      auditory: 'default',
      cognitive: 'default',
      language: 'default',
      motor: 'default',
      visual: 'default',
    },
    completedAt: null,
    createdAt: now,
    id,
    functionalAnswers: [],
    learnedPreferences: [],
    preferences: {
      explanationStyle: 'balanced',
      informationDensity: 'standard',
      lineSpacing: 1.5,
      preserveTechnicalTerms: true,
      readingWidth: 'normal',
      reduceMotion: false,
      strongFocus: true,
      targetSizePx: 44,
      textScale: 1,
    },
    summary: '',
    updatedAt: now,
    version: 1,
  });
}

function supportFromDifficulty(
  difficulty: FunctionalDifficulty,
): z.infer<typeof supportLevelSchema> {
  if (
    difficulty === 'a_lot_of_difficulty' ||
    difficulty === 'cannot_reliably'
  ) {
    return 'important';
  }
  return difficulty === 'some_difficulty' ? 'helpful' : 'default';
}

export function applyFunctionalAnswers(
  original: BrowserProfile,
  answers: FunctionalAnswer[],
  now = new Date().toISOString(),
): BrowserProfile {
  const profile = structuredClone(original);
  profile.functionalAnswers = answers;

  for (const answer of answers) {
    profile.capabilities[answer.area] = supportFromDifficulty(answer.difficulty);
    const support = profile.capabilities[answer.area];
    if (support === 'default') continue;

    if (answer.area === 'visual') {
      profile.preferences.textScale = support === 'important' ? 1.3 : 1.15;
      profile.preferences.lineSpacing = support === 'important' ? 1.7 : 1.55;
      profile.preferences.readingWidth = 'narrow';
    }
    if (answer.area === 'motor') {
      profile.preferences.targetSizePx = support === 'important' ? 60 : 52;
      profile.preferences.strongFocus = true;
    }
    if (answer.area === 'attention') {
      profile.preferences.reduceMotion = true;
      profile.preferences.informationDensity =
        support === 'important' ? 'step_by_step' : 'calm';
    }
    if (answer.area === 'cognitive') {
      profile.preferences.informationDensity =
        support === 'important' ? 'step_by_step' : 'calm';
      profile.preferences.explanationStyle = 'concise';
    }
    if (answer.area === 'language') {
      profile.preferences.explanationStyle = 'concise';
      profile.preferences.preserveTechnicalTerms = false;
    }
  }

  profile.updatedAt = now;
  return browserProfileSchema.parse(profile);
}

export function applyCalibrationChoices(
  original: BrowserProfile,
  choices: CalibrationChoice[],
  now = new Date().toISOString(),
): BrowserProfile {
  const profile = structuredClone(original);

  for (const choice of choices) {
    if (choice.area === 'reading') {
      const reading = {
        standard: { lineSpacing: 1.4, readingWidth: 'normal', textScale: 1 },
        comfortable: {
          lineSpacing: 1.55,
          readingWidth: 'narrow',
          textScale: 1.15,
        },
        largest: {
          lineSpacing: 1.7,
          readingWidth: 'narrow',
          textScale: 1.3,
        },
      } as const;
      Object.assign(profile.preferences, reading[choice.choice]);
      profile.capabilities.visual =
        choice.choice === 'standard'
          ? 'default'
          : choice.choice === 'largest'
            ? 'important'
            : 'helpful';
    }

    if (choice.area === 'interaction') {
      profile.preferences.targetSizePx = {
        comfortable: 52,
        largest: 60,
        standard: 44,
      }[choice.choice];
      profile.capabilities.motor =
        choice.choice === 'standard'
          ? 'default'
          : choice.choice === 'largest'
            ? 'important'
            : 'helpful';
    }

    if (choice.area === 'attention') {
      profile.preferences.informationDensity = choice.choice;
      profile.preferences.reduceMotion = choice.choice !== 'standard';
      profile.capabilities.attention =
        choice.choice === 'standard'
          ? 'default'
          : choice.choice === 'step_by_step'
            ? 'important'
            : 'helpful';
      profile.capabilities.cognitive =
        choice.choice === 'step_by_step' ? 'important' : 'default';
    }

    if (choice.area === 'understanding') {
      profile.preferences.explanationStyle = choice.choice;
      profile.preferences.preserveTechnicalTerms =
        choice.preserveTechnicalTerms;
      profile.capabilities.language =
        choice.choice === 'balanced' && choice.preserveTechnicalTerms
          ? 'default'
          : 'helpful';
    }
  }

  profile.updatedAt = now;
  return browserProfileSchema.parse(profile);
}

export function completeBrowserProfile(
  profile: BrowserProfile,
  summary: string,
  now = new Date().toISOString(),
): BrowserProfile {
  return browserProfileSchema.parse({
    ...profile,
    completedAt: now,
    summary,
    updatedAt: now,
  });
}

export function summarizeBrowserProfile(profile: BrowserProfile): string {
  const parts = [
    profile.preferences.textScale > 1
      ? 'comfortable text sizing and spacing'
      : 'the original text size',
    `${profile.preferences.targetSizePx}px interaction targets`,
    profile.preferences.reduceMotion
      ? 'less movement'
      : 'standard page movement',
    profile.preferences.informationDensity === 'standard'
      ? 'the full page at once'
      : profile.preferences.informationDensity === 'step_by_step'
        ? 'one clear step at a time'
        : 'a calmer information layout',
    `${profile.preferences.explanationStyle} explanations`,
    profile.preferences.preserveTechnicalTerms
      ? 'technical terms preserved'
      : 'technical terms explained in simpler language',
  ];
  return `I’ll use ${parts.join(', ')}.`;
}
