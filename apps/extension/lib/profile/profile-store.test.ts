import { createNeutralProfile } from '@aura/shared';
import { describe, expect, it } from 'vitest';

import {
  createProfileStore,
  type StorageAreaAdapter,
} from './profile-store';

class MemoryStorage implements StorageAreaAdapter {
  readonly values: Record<string, unknown> = {};

  get(keys: string[]): Promise<Record<string, unknown>> {
    return Promise.resolve(
      Object.fromEntries(keys.map((key) => [key, this.values[key]])),
    );
  }

  set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, structuredClone(items));
    return Promise.resolve();
  }
}

describe('profile store', () => {
  it('seeds three demo profiles and persists the active profile', async () => {
    const storage = new MemoryStorage();
    const store = createProfileStore(storage);

    const initial = await store.getState();
    expect(initial.profiles).toHaveLength(3);
    expect(initial.activeProfileId).toBe('demo-low-vision');
    expect(initial.needsOnboarding).toBe(true);

    const selected = await store.setActiveProfile('demo-attention-language');
    expect(selected.activeProfileId).toBe('demo-attention-language');

    const reloaded = await createProfileStore(storage).getState();
    expect(reloaded.activeProfileId).toBe('demo-attention-language');
    expect(reloaded.needsOnboarding).toBe(false);
  });

  it('validates and saves a profile as active', async () => {
    const storage = new MemoryStorage();
    const store = createProfileStore(storage);
    const profile = createNeutralProfile({
      id: 'custom-profile',
      name: 'Custom profile',
      now: '2026-07-18T12:00:00.000Z',
    });

    const state = await store.saveProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        reduceMotion: true,
      },
    });

    expect(state.activeProfileId).toBe('custom-profile');
    expect(state.profiles).toHaveLength(4);
    expect(
      state.profiles.find(({ id }) => id === 'custom-profile')?.preferences
        .reduceMotion,
    ).toBe(true);
  });

  it('rejects selecting an unknown profile', async () => {
    const store = createProfileStore(new MemoryStorage());

    await expect(store.setActiveProfile('missing')).rejects.toThrow(
      'does not exist',
    );
  });

  it('recovers safely from invalid stored data', async () => {
    const storage = new MemoryStorage();
    storage.values['aura.profiles'] = [{ version: 1, name: 'broken' }];
    storage.values['aura.activeProfileId'] = 'broken';

    const state = await createProfileStore(storage).getState();

    expect(state.profiles).toHaveLength(3);
    expect(state.activeProfileId).toBe('demo-low-vision');
  });
});
