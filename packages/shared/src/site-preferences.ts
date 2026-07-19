import { z } from './zod.js';
import { adaptationPreferencePatchSchema } from './profile.js';

export const sitePreferenceSchema = z
  .object({
    origin: z.string().url().max(300),
    enabled: z.boolean(),
    autoAdapt: z.boolean(),
    preferencePatch: adaptationPreferencePatchSchema,
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const sitePreferenceListSchema = z.array(sitePreferenceSchema).max(100);

export type SitePreference = z.infer<typeof sitePreferenceSchema>;
export type SitePreferenceList = z.infer<typeof sitePreferenceListSchema>;
