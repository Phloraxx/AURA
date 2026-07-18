import { z } from 'zod';

export const evidenceSourceSchema = z.enum([
  'self_report',
  'calibration',
  'explicit_preference',
]);

export const capabilityDimensionSchema = z.object({
  capacity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  sources: z.array(evidenceSourceSchema),
});

export const capabilityDimensionsSchema = z.object({
  visual: capabilityDimensionSchema,
  auditory: capabilityDimensionSchema,
  motor: capabilityDimensionSchema,
  cognitive: capabilityDimensionSchema,
  attention: capabilityDimensionSchema,
  language: capabilityDimensionSchema,
});

export const profileModalitiesSchema = z.object({
  preferredInput: z.array(z.enum(['pointer', 'keyboard', 'voice'])),
  preferredOutput: z.array(z.enum(['visual', 'speech'])),
  screenReader: z.boolean(),
});

export const adaptationPreferencesSchema = z.object({
  textScale: z.number().min(1).max(2),
  lineSpacing: z.number().min(1).max(2.5),
  readingWidth: z.enum(['normal', 'narrow', 'very_narrow']),
  contrast: z.enum(['default', 'enhanced']),
  reduceMotion: z.boolean(),
  focusMode: z.boolean(),
  simplifyLanguage: z.boolean(),
  enlargeTargets: z.boolean(),
  targetSizePx: z.number().int().min(32).max(72),
  stepByStepForms: z.boolean(),
  hideDistractions: z.boolean(),
  clarifyControls: z.boolean(),
});

export const capabilityProfileSchema = z.object({
  version: z.literal(1),
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  dimensions: capabilityDimensionsSchema,
  modalities: profileModalitiesSchema,
  preferences: adaptationPreferencesSchema,
});

export const capabilityProfileListSchema = z.array(capabilityProfileSchema);

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type CapabilityDimension = z.infer<typeof capabilityDimensionSchema>;
export type CapabilityDimensions = z.infer<typeof capabilityDimensionsSchema>;
export type ProfileModalities = z.infer<typeof profileModalitiesSchema>;
export type AdaptationPreferences = z.infer<
  typeof adaptationPreferencesSchema
>;
export type CapabilityProfile = z.infer<typeof capabilityProfileSchema>;

export const CAPABILITY_DIMENSION_NAMES = [
  'visual',
  'auditory',
  'motor',
  'cognitive',
  'attention',
  'language',
] as const satisfies readonly (keyof CapabilityDimensions)[];

export const DEFAULT_ADAPTATION_PREFERENCES: AdaptationPreferences = {
  textScale: 1,
  lineSpacing: 1,
  readingWidth: 'normal',
  contrast: 'default',
  reduceMotion: false,
  focusMode: false,
  simplifyLanguage: false,
  enlargeTargets: false,
  targetSizePx: 44,
  stepByStepForms: false,
  hideDistractions: false,
  clarifyControls: false,
};

const neutralDimension = (): CapabilityDimension => ({
  capacity: 1,
  confidence: 0,
  sources: [],
});

export interface CreateProfileOptions {
  id?: string;
  name: string;
  now?: string;
}

export function createNeutralProfile({
  id = globalThis.crypto.randomUUID(),
  name,
  now = new Date().toISOString(),
}: CreateProfileOptions): CapabilityProfile {
  return capabilityProfileSchema.parse({
    version: 1,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    dimensions: {
      visual: neutralDimension(),
      auditory: neutralDimension(),
      motor: neutralDimension(),
      cognitive: neutralDimension(),
      attention: neutralDimension(),
      language: neutralDimension(),
    },
    modalities: {
      preferredInput: ['pointer', 'keyboard'],
      preferredOutput: ['visual'],
      screenReader: false,
    },
    preferences: DEFAULT_ADAPTATION_PREFERENCES,
  });
}
