import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultBrowserProfile } from '../shared/profile';
import { ProfileStore } from './profile-store';

const temporaryDirectories: string[] = [];

async function createStore(): Promise<ProfileStore> {
  const directory = await mkdtemp(join(tmpdir(), 'aura-profile-store-'));
  temporaryDirectories.push(directory);
  return new ProfileStore(directory);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe('ProfileStore', () => {
  it('persists and reloads a versioned profile atomically', async () => {
    const store = await createStore();
    const profile = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-one',
    );

    await store.save(profile);

    await expect(store.load()).resolves.toEqual(profile);
    const serialized = await readFile(store.profilePath, 'utf8');
    expect(serialized).toContain('"version": 1');
  });

  it('returns null for absent or invalid state and supports reset', async () => {
    const store = await createStore();
    await expect(store.load()).resolves.toBeNull();

    const profile = createDefaultBrowserProfile(
      '2026-07-24T00:00:00.000Z',
      'profile-two',
    );
    await store.save(profile);
    await store.reset();

    await expect(store.load()).resolves.toBeNull();
  });

  it('rejects unversioned or malformed profile writes', async () => {
    const store = await createStore();
    await expect(store.save({ id: 'bad-profile' })).rejects.toThrow();
    await expect(store.load()).resolves.toBeNull();
  });
});
