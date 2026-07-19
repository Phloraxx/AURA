import {
  adaptationPreferencePatchSchema,
  sitePreferenceListSchema,
  sitePreferenceSchema,
  type AdaptationPreferencePatch,
  type SitePreference,
} from '@aura/shared';

const STORAGE_KEY = 'aura.sitePreferences.v1';

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

export function createSitePreferenceStore(): SitePreferenceStore {
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
      const next = sitePreferenceSchema.parse({
        origin: normalized,
        enabled: true,
        autoAdapt,
        preferencePatch: adaptationPreferencePatchSchema.parse(preferencePatch),
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
