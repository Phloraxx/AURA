import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNeutralProfile } from '@aura/shared';

import { resolveAdaptationPreferences } from '../profile/preference-resolver';
import { hasSitePermission, requestSitePermission } from './permission-manager';
import { createSitePreferenceStore, normalizeSiteOrigin } from './site-preference-store';

describe('site preference memory', () => {
  const values: Record<string, unknown> = {};

  beforeEach(() => {
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: vi.fn((keys: string | string[]) => {
            const requested = Array.isArray(keys) ? keys : [keys];
            return Promise.resolve(
              Object.fromEntries(requested.map((key) => [key, values[key]])),
            );
          }),
          set: vi.fn((next: Record<string, unknown>) => {
            Object.assign(values, next);
            return Promise.resolve();
          }),
        },
      },
      permissions: {
        request: vi.fn(() => Promise.resolve(true)),
        contains: vi.fn(() => Promise.resolve(true)),
      },
    });
  });

  afterEach(() => {
    for (const key of Object.keys(values)) delete values[key];
    vi.unstubAllGlobals();
  });

  it('normalizes remembered sites to an origin without path or query data', () => {
    expect(normalizeSiteOrigin('https://example.com/account?token=secret')).toBe('https://example.com');
    expect(() => normalizeSiteOrigin('file:///tmp/page.html')).toThrow(/web pages only/u);
  });

  it('stores validated origin-level local preference patches only', async () => {
    const store = createSitePreferenceStore();
    await store.save({
      origin: 'https://example.com/private?token=secret',
      autoAdapt: false,
      preferencePatch: {
        textScale: 1.4,
        enlargeTargets: true,
        simplifyLanguage: true,
        hideDistractions: true,
        clarifyControls: true,
        stepByStepForms: true,
      },
    });

    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({
        origin: 'https://example.com',
        autoAdapt: false,
        preferencePatch: { textScale: 1.4, enlargeTargets: true },
      }),
    ]);
    expect(JSON.stringify(values)).not.toContain('token');
  });

  it('stores only choices that differ from the saved active profile', async () => {
    const profile = createNeutralProfile({
      id: 'profile:active',
      name: 'Active profile',
      now: '2026-07-19T00:00:00.000Z',
    });
    const baseline = resolveAdaptationPreferences(profile).preferences;
    values['aura.activeProfileId'] = profile.id;
    values['aura.profiles'] = [profile];

    const store = createSitePreferenceStore();
    await store.save({
      origin: 'https://example.com',
      autoAdapt: true,
      preferencePatch: {
        ...baseline,
        enlargeTargets: !baseline.enlargeTargets,
      },
    });

    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({
        preferencePatch: { enlargeTargets: !baseline.enlargeTargets },
      }),
    ]);
  });

  it('uses explicit permission checks for always-adapt mode', async () => {
    expect(await requestSitePermission('https://example.com/path')).toBe(true);
    expect(browser.permissions.request).toHaveBeenCalledWith({
      origins: ['https://example.com/*'],
    });
    expect(await hasSitePermission('https://example.com/path')).toBe(true);
  });
});
