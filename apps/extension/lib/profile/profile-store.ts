import {
  capabilityProfileListSchema,
  capabilityProfileSchema,
  DEMO_PROFILES,
  type CapabilityProfile,
} from '@aura/shared';

const STORAGE_KEYS = {
  activeProfileId: 'aura.activeProfileId',
  profiles: 'aura.profiles',
} as const;

export interface StorageAreaAdapter {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface ProfileState {
  activeProfileId: string;
  profiles: CapabilityProfile[];
}

export interface ProfileStore {
  getState(): Promise<ProfileState>;
  saveProfile(profile: CapabilityProfile): Promise<ProfileState>;
  setActiveProfile(profileId: string): Promise<ProfileState>;
  resetDemoProfiles(): Promise<ProfileState>;
}

function freshDemoProfiles(): CapabilityProfile[] {
  return DEMO_PROFILES.map((profile) => capabilityProfileSchema.parse(profile));
}

function parseStoredProfiles(value: unknown): CapabilityProfile[] | undefined {
  const result = capabilityProfileListSchema.safeParse(value);
  return result.success && result.data.length > 0 ? result.data : undefined;
}

async function writeState(
  storageArea: StorageAreaAdapter,
  state: ProfileState,
): Promise<void> {
  await storageArea.set({
    [STORAGE_KEYS.activeProfileId]: state.activeProfileId,
    [STORAGE_KEYS.profiles]: state.profiles,
  });
}

export function createProfileStore(
  storageArea: StorageAreaAdapter = browser.storage.local,
): ProfileStore {
  async function getState(): Promise<ProfileState> {
    const stored = await storageArea.get([
      STORAGE_KEYS.profiles,
      STORAGE_KEYS.activeProfileId,
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
        const state = { activeProfileId, profiles };
        if (activeProfileId !== storedActiveId) {
          await writeState(storageArea, state);
        }
        return state;
      }
    }

    return resetDemoProfiles();
  }

  async function saveProfile(profile: CapabilityProfile): Promise<ProfileState> {
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
      profiles,
    };
    await writeState(storageArea, state);
    return state;
  }

  async function setActiveProfile(profileId: string): Promise<ProfileState> {
    const current = await getState();
    if (!current.profiles.some(({ id }) => id === profileId)) {
      throw new Error('The selected AURA profile does not exist.');
    }

    const state = { ...current, activeProfileId: profileId };
    await writeState(storageArea, state);
    return state;
  }

  async function resetDemoProfiles(): Promise<ProfileState> {
    const profiles = freshDemoProfiles();
    const activeProfileId = profiles[0]?.id;
    if (!activeProfileId) {
      throw new Error('AURA demo profiles are unavailable.');
    }

    const state = { activeProfileId, profiles };
    await writeState(storageArea, state);
    return state;
  }

  return {
    getState,
    resetDemoProfiles,
    saveProfile,
    setActiveProfile,
  };
}
