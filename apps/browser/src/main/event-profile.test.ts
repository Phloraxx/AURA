import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { browserProfileSchema } from '../shared/profile';

describe('event backup profile', () => {
  it('remains a valid, completed, non-diagnostic browser profile', async () => {
    const serialized = await readFile(
      resolve('../../fixtures/aura-event-profile.json'),
      'utf8',
    );
    const profile = browserProfileSchema.parse(JSON.parse(serialized));
    expect(profile.completedAt).not.toBeNull();
    expect(profile.learnedPreferences).toHaveLength(2);
    expect(JSON.stringify(profile)).not.toMatch(
      /\b(adhd|autism|dyslexia|diagnosis)\b/i,
    );
  });
});
