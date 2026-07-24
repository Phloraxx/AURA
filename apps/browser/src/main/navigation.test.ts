import { describe, expect, it } from 'vitest';

import { friendlyNavigationError, normalizeAddress } from './navigation';

describe('normalizeAddress', () => {
  it('keeps valid HTTPS addresses', () => {
    expect(normalizeAddress('https://example.com/path')).toBe(
      'https://example.com/path',
    );
  });

  it('adds HTTPS to a domain', () => {
    expect(normalizeAddress('wikipedia.org')).toBe('https://wikipedia.org/');
  });

  it('supports localhost development URLs', () => {
    expect(normalizeAddress('localhost:4173/demo')).toBe(
      'http://localhost:4173/demo',
    );
  });

  it('turns ordinary text into a search', () => {
    expect(normalizeAddress('accessible web design')).toBe(
      'https://www.google.com/search?q=accessible%20web%20design',
    );
  });
});

describe('friendlyNavigationError', () => {
  it('turns Chromium network codes into user-facing guidance', () => {
    expect(friendlyNavigationError(-106)).toContain('internet');
    expect(friendlyNavigationError(-105)).toContain('find that website');
    expect(friendlyNavigationError(-118)).toContain('too long');
    expect(friendlyNavigationError(-501)).not.toContain('ERR_');
  });
});
