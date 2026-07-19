import { describe, expect, it, vi } from 'vitest';

import { createProfileStore, type StorageAreaAdapter } from './profile-store';

describe('profile demo reset', () => {
  it('clears remembered site choices, revokes their permissions, and restores Rescue defaults', async () => {
    const values: Record<string, unknown> = {
      'aura.sitePreferences.v1': [
        {
          origin: 'https://example.com',
          enabled: true,
          autoAdapt: true,
          preferencePatch: { textScale: 1.4 },
          updatedAt: '2026-07-19T00:00:00.000Z',
        },
      ],
      'aura.rescueEnabled.v1': false,
    };
    const storage: StorageAreaAdapter = {
      async get(keys) {
        return Object.fromEntries(keys.map((key) => [key, values[key]]));
      },
      async set(items) {
        Object.assign(values, items);
      },
    };
    const removePermission = vi.fn(async () => true);
    const store = createProfileStore(storage, removePermission);

    const state = await store.resetDemoProfiles();

    expect(state.needsOnboarding).toBe(false);
    expect(state.profiles.length).toBeGreaterThanOrEqual(3);
    expect(removePermission).toHaveBeenCalledWith('https://example.com');
    expect(values['aura.sitePreferences.v1']).toEqual([]);
    expect(values['aura.rescueEnabled.v1']).toBe(true);
  });

  it('still completes the local reset when optional permission revocation fails', async () => {
    const values: Record<string, unknown> = {
      'aura.sitePreferences.v1': [
        {
          origin: 'https://example.com',
          enabled: true,
          autoAdapt: true,
          preferencePatch: {},
          updatedAt: '2026-07-19T00:00:00.000Z',
        },
      ],
    };
    const storage: StorageAreaAdapter = {
      async get(keys) {
        return Object.fromEntries(keys.map((key) => [key, values[key]]));
      },
      async set(items) {
        Object.assign(values, items);
      },
    };
    const store = createProfileStore(storage, vi.fn(async () => {
      throw new Error('permission API unavailable');
    }));

    await expect(store.resetDemoProfiles()).resolves.toEqual(
      expect.objectContaining({ needsOnboarding: false }),
    );
    expect(values['aura.sitePreferences.v1']).toEqual([]);
  });
});
