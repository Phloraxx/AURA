import {
  capabilityProfileListSchema,
  capabilityProfileSchema,
  DEMO_PROFILES,
  sitePreferenceListSchema,
  type CapabilityProfile,
} from '@aura/shared';

import { removeSitePermission } from '../site/permission-manager';

const STORAGE_KEYS = {
  activeProfileId: 'aura.activeProfileId',
  hasLaunched: 'aura.hasLaunched',
  profiles: 'aura.profiles',
} as const;

const SITE_PREFERENCES_KEY = 'aura.sitePreferences.v1';
const DEMO_RESET_VALUES = {
  [SITE_PREFERENCES_KEY]: [],
  'aura.rescueEnabled.v1': true,
} as const;

export interface StorageAreaAdapter {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface ProfileState {
  activeProfileId: string;
  needsOnboarding: boolean;
  profiles: CapabilityProfile[];
}

export interface ProfileStore {
  getState(): Promise<ProfileState>;
  saveProfile(profile: CapabilityProfile): Promise<ProfileState>;
  setActiveProfile(profileId: string): Promise<ProfileState>;
  resetDemoProfiles(): Promise<ProfileState>;
}

type SitePermissionRemover = (origin: string) => Promise<boolean>;

function logProfileError(action: string, error: unknown): void {
  console.error(`[AURA profile] ${action}`, error);
}

function freshDemoProfiles(): CapabilityProfile[] {
  return DEMO_PROFILES.map((profile) => capabilityProfileSchema.parse(profile));
}

function parseStoredProfiles(value: unknown): CapabilityProfile[] | undefined {
  const result = capabilityProfileListSchema.safeParse(value);
  if (!result.success) {
    if (value !== undefined) {
      console.warn('[AURA profile] Stored profiles failed validation; reseeding demos.', {
        issues: result.error.issues.map(({ code, path, message }) => ({ code, path, message })),
      });
    }
    return undefined;
  }
  return result.data.length > 0 ? result.data : undefined;
}

async function writeState(
  storageArea: StorageAreaAdapter,
  state: ProfileState,
): Promise<void> {
  try {
    await storageArea.set({
      [STORAGE_KEYS.activeProfileId]: state.activeProfileId,
      [STORAGE_KEYS.hasLaunched]: true,
      [STORAGE_KEYS.profiles]: state.profiles,
    });
  } catch (error) {
    logProfileError('Failed to write profile state to browser storage.', error);
    throw error;
  }
}

async function revokeRememberedSitePermissions(
  storageArea: StorageAreaAdapter,
  removePermission: SitePermissionRemover,
): Promise<void> {
  const stored = await storageArea.get([SITE_PREFERENCES_KEY]);
  const sites = sitePreferenceListSchema.safeParse(stored[SITE_PREFERENCES_KEY] ?? []);
  if (!sites.success) {
    console.warn('[AURA profile] Stored site memory was invalid during demo reset; clearing it anyway.');
    return;
  }
  const results = await Promise.allSettled(
    sites.data.map(({ origin }) => removePermission(origin)),
  );
  const failures = results.filter(({ status }) => status === 'rejected').length;
  if (failures > 0) {
    console.warn('[AURA profile] Some optional site permissions could not be revoked during demo reset.', {
      failures,
    });
  }
}

export function createProfileStore(
  storageArea: StorageAreaAdapter = browser.storage.local,
  removePermission: SitePermissionRemover = removeSitePermission,
): ProfileStore {
  async function getState(): Promise<ProfileState> {
    try {
      const stored = await storageArea.get([
        STORAGE_KEYS.profiles,
        STORAGE_KEYS.activeProfileId,
        STORAGE_KEYS.hasLaunched,
      ]);
      const profiles = parseStoredProfiles(stored[STORAGE_KEYS.profiles]);
      const storedActiveId = stored[STORAGE_KEYS.activeProfileId];

      if (profiles) {
        const activeProfileId =
          typeof storedActiveId === 'string' &&
          profiles.some(({ id }) => id === storedActiveId)
            ? storedActiveId
            : profiles[0]?.id;

        if (activeProfileId) {
          const state = {
            activeProfileId,
            needsOnboarding: stored[STORAGE_KEYS.hasLaunched] !== true,
            profiles,
          };
          if (
            activeProfileId !== storedActiveId ||
            stored[STORAGE_KEYS.hasLaunched] !== true
          ) {
            await writeState(storageArea, state);
          }
          return state;
        }
      }

      return seedDemoProfiles(true);
    } catch (error) {
      logProfileError('Failed to load profile state.', error);
      throw error;
    }
  }

  async function saveProfile(profile: CapabilityProfile): Promise<ProfileState> {
    try {
      const validated = capabilityProfileSchema.parse(profile);
      const current = await getState();
      const existingIndex = current.profiles.findIndex(({ id }) => id === validated.id);
      const profiles = [...current.profiles];

      if (existingIndex >= 0) {
        profiles[existingIndex] = validated;
      } else {
        profiles.push(validated);
      }

      const state = {
        activeProfileId: validated.id,
        needsOnboarding: false,
        profiles,
      };
      await writeState(storageArea, state);
      console.info('[AURA profile] Profile saved successfully.', {
        activeProfileId: state.activeProfileId,
        profileCount: state.profiles.length,
      });
      return state;
    } catch (error) {
      logProfileError('Failed to validate or save the active profile.', error);
      throw error;
    }
  }

  async function setActiveProfile(profileId: string): Promise<ProfileState> {
    try {
      const current = await getState();
      if (!current.profiles.some(({ id }) => id === profileId)) {
        throw new Error('The selected AURA profile does not exist.');
      }

      const state = { ...current, activeProfileId: profileId, needsOnboarding: false };
      await writeState(storageArea, state);
      console.info('[AURA profile] Active profile changed.', { activeProfileId: profileId });
      return state;
    } catch (error) {
      logProfileError('Failed to change the active profile.', error);
      throw error;
    }
  }

  async function seedDemoProfiles(needsOnboarding: boolean): Promise<ProfileState> {
    const profiles = freshDemoProfiles();
    const activeProfileId = profiles[0]?.id;
    if (!activeProfileId) {
      throw new Error('AURA demo profiles are unavailable.');
    }

    const state = { activeProfileId, needsOnboarding, profiles };
    await writeState(storageArea, state);
    console.info('[AURA profile] Demo profiles seeded.', {
      activeProfileId,
      profileCount: profiles.length,
      needsOnboarding,
    });
    return state;
  }

  async function resetDemoProfiles(): Promise<ProfileState> {
    try {
      await revokeRememberedSitePermissions(storageArea, removePermission);
      const state = await seedDemoProfiles(false);
      await storageArea.set(DEMO_RESET_VALUES);
      console.info('[AURA profile] Demo profiles, site memory, optional site permissions, and Rescue defaults were reset.');
      return state;
    } catch (error) {
      logProfileError('Failed to reset demo profiles.', error);
      throw error;
    }
  }

  return {
    getState,
    resetDemoProfiles,
    saveProfile,
    setActiveProfile,
  };
}
