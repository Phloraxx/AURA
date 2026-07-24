import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  browserProfileSchema,
  type BrowserProfile,
} from '../shared/profile';

const PROFILE_DIRECTORY = 'aura';
const PROFILE_FILENAME = 'profile.json';

export class ProfileStore {
  readonly profilePath: string;

  constructor(userDataDirectory: string) {
    this.profilePath = join(
      userDataDirectory,
      PROFILE_DIRECTORY,
      PROFILE_FILENAME,
    );
  }

  async load(): Promise<BrowserProfile | null> {
    try {
      const serialized = await readFile(this.profilePath, 'utf8');
      const parsed = browserProfileSchema.safeParse(JSON.parse(serialized));
      return parsed.success ? parsed.data : null;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }
      return null;
    }
  }

  async save(untrustedProfile: unknown): Promise<BrowserProfile> {
    const profile = browserProfileSchema.parse(untrustedProfile);
    const directory = join(this.profilePath, '..');
    const temporaryPath = `${this.profilePath}.${randomUUID()}.tmp`;

    await mkdir(directory, { recursive: true });
    await writeFile(
      temporaryPath,
      `${JSON.stringify(profile, null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryPath, this.profilePath);
    return profile;
  }

  async reset(): Promise<void> {
    await rm(this.profilePath, { force: true });
  }
}
