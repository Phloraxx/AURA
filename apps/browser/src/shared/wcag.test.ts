import { describe, expect, it } from 'vitest';

import {
  calculateWcagIndicator,
  compareWcagScans,
  type WcagScanResult,
} from './wcag';

function scan(
  indicator: number,
  issues: Array<{ help: string; id: string }>,
): WcagScanResult {
  return {
    failedRules: issues.length,
    indicator,
    issues: issues.map(({ help, id }) => ({
      areas: ['visual'],
      help,
      helpUrl: `https://example.com/${id}`,
      id,
      impact: 'serious',
      nodeCount: 1,
    })),
    needsReviewRules: 1,
    pageTitle: 'Fixture',
    pageUrl: 'https://example.com',
    passedRules: 10,
    reviewItems: [],
    scannedAt: new Date(0).toISOString(),
  };
}

describe('calculateWcagIndicator', () => {
  it('uses only passed and failed automated rules', () => {
    expect(calculateWcagIndicator(36, 4)).toBe(90);
  });

  it('returns zero when no rule produced an automated outcome', () => {
    expect(calculateWcagIndicator(0, 0)).toBe(0);
  });

  it('explains resolved, remaining, and newly introduced outcomes', () => {
    const comparison = compareWcagScans(
      scan(70, [
        { help: 'Contrast', id: 'color-contrast' },
        { help: 'Names', id: 'button-name' },
      ]),
      scan(90, [
        { help: 'Names', id: 'button-name' },
        { help: 'Landmarks', id: 'region' },
      ]),
    );
    expect(comparison.delta).toBe(20);
    expect(comparison.resolved.map(({ id }) => id)).toEqual(['color-contrast']);
    expect(comparison.remaining.map(({ id }) => id)).toEqual(['button-name']);
    expect(comparison.introduced.map(({ id }) => id)).toEqual(['region']);
  });
});
