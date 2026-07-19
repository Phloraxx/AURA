import {
  adaptationPreferencePatchSchema,
  capabilityProfileListSchema,
  sitePreferenceListSchema,
  sitePreferenceSchema,
  type AdaptationPreferencePatch,
  type CapabilityProfile,
  type SitePreference,
} from '@aura/shared';

import { resolveAdaptationPreferences } from '../profile/preference-resolver';

const STORAGE_KEY = 'aura.sitePreferences.v1';
const ACTIVE_PROFILE_ID_KEY = 'aura.activeProfileId';
const PROFILES_KEY = 'aura.profiles';

export function normalizeSiteOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('AURA site memory supports web pages only.');
  return `${url.protocol}//${url.host}`;
}

export function sitePermissionPattern(origin: string): string {
  const normalized = normalizeSiteOrigin(origin);
  return `${normalized}/*`;
}

export interface SitePreferenceStore {
  list(): Promise<SitePreference[]>;
  get(origin: string): Promise<SitePreference | undefined>;
  save(input: { origin: string; autoAdapt: boolean; preferencePatch: AdaptationPreferencePatch }): Promise<SitePreference>;
  remove(origin: string): Promise<void>;
}

type ActiveProfileReader = () => Promise<CapabilityProfile | undefined>;

async function readActiveProfileFromStorage(): Promise<CapabilityProfile | undefined> {
  const stored = await browser.storage.local.get([ACTIVE_PROFILE_ID_KEY, PROFILES_KEY]);
  const profiles = capabilityProfileListSchema.safeParse(stored[PROFILES_KEY]);
  if (!profiles.success) return undefined;
  const activeProfileId = stored[ACTIVE_PROFILE_ID_KEY];
  if (typeof activeProfileId !== 'string') return undefined;
  return profiles.data.find(({ id }) => id === activeProfileId);
}

export function preferenceDelta(
  candidate: AdaptationPreferencePatch,
  baseline: CapabilityProfile['preferences'],
): AdaptationPreferencePatch {
  const parsed = adaptationPreferencePatchSchema.parse(candidate);
  const delta: Record<string, unknown> = {};
  for (const key of Object.keys(parsed) as Array<keyof typeof parsed>) {
    const value = parsed[key];
    if (value !== undefined && value !== baseline[key]) delta[key] = value;
  }
  return adaptationPreferencePatchSchema.parse(delta);
}

export function createSitePreferenceStore(
  activeProfileReader: ActiveProfileReader = readActiveProfileFromStorage,
): SitePreferenceStore {
  async function list(): Promise<SitePreference[]> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return sitePreferenceListSchema.parse(result[STORAGE_KEY] ?? []);
  }

  return {
    list,
    async get(origin) {
      const normalized = normalizeSiteOrigin(origin);
      return (await list()).find((site) => site.origin === normalized);
    },
    async save({ origin, autoAdapt, preferencePatch }) {
      const normalized = normalizeSiteOrigin(origin);
      const existing = await list();
      let storedPatch = adaptationPreferencePatchSchema.parse(preferencePatch);
      try {
        const activeProfile = await activeProfileReader();
        if (activeProfile) {
          storedPatch = preferenceDelta(
            storedPatch,
            resolveAdaptationPreferences(activeProfile).preferences,
          );
        }
      } catch (error) {
        console.debug('[AURA site] Active profile unavailable while computing site preference delta.', error);
      }
      const next = sitePreferenceSchema.parse({
        origin: normalized,
        enabled: true,
        autoAdapt,
        preferencePatch: storedPatch,
        updatedAt: new Date().toISOString(),
      });
      await browser.storage.local.set({
        [STORAGE_KEY]: [...existing.filter((site) => site.origin !== normalized), next],
      });
      return next;
    },
    async remove(origin) {
      const normalized = normalizeSiteOrigin(origin);
      const next = (await list()).filter((site) => site.origin !== normalized);
      await browser.storage.local.set({ [STORAGE_KEY]: next });
    },
  };
}
