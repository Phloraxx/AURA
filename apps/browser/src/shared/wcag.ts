import { z } from 'zod';

import { functionalAreaSchema } from './profile';

export const wcagIssueSchema = z.object({
  areas: z.array(functionalAreaSchema),
  help: z.string(),
  helpUrl: z.string().url(),
  id: z.string(),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']).nullable(),
  nodeCount: z.number().int().nonnegative(),
});

export const wcagScanResultSchema = z.object({
  failedRules: z.number().int().nonnegative(),
  indicator: z.number().int().min(0).max(100),
  issues: z.array(wcagIssueSchema),
  needsReviewRules: z.number().int().nonnegative(),
  pageTitle: z.string(),
  pageUrl: z.string(),
  passedRules: z.number().int().nonnegative(),
  reviewItems: z.array(wcagIssueSchema),
  scannedAt: z.string(),
});

export type WcagScanResult = z.infer<typeof wcagScanResultSchema>;

export function calculateWcagIndicator(
  passedRules: number,
  failedRules: number,
): number {
  const tested = passedRules + failedRules;
  return tested === 0 ? 0 : Math.round((passedRules / tested) * 100);
}

export interface WcagComparison {
  delta: number;
  introduced: WcagScanResult['issues'];
  remaining: WcagScanResult['issues'];
  resolved: WcagScanResult['issues'];
}

export function compareWcagScans(
  before: WcagScanResult,
  after: WcagScanResult,
): WcagComparison {
  const beforeById = new Map(before.issues.map((issue) => [issue.id, issue]));
  const afterById = new Map(after.issues.map((issue) => [issue.id, issue]));
  return {
    delta: after.indicator - before.indicator,
    introduced: after.issues.filter((issue) => !beforeById.has(issue.id)),
    remaining: after.issues.filter((issue) => beforeById.has(issue.id)),
    resolved: before.issues.filter((issue) => !afterById.has(issue.id)),
  };
}
