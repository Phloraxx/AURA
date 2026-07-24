import { z } from 'zod';

export const pageElementCategorySchema = z.enum([
  'control',
  'form',
  'heading',
  'list',
  'media',
  'navigation',
  'region',
  'table',
  'text',
]);

export const pageRectSchema = z.object({
  height: z.number().nonnegative(),
  width: z.number().nonnegative(),
  x: z.number(),
  y: z.number(),
});

export const pageElementStateSchema = z.object({
  checked: z.boolean().nullable(),
  disabled: z.boolean(),
  expanded: z.boolean().nullable(),
  selected: z.boolean().nullable(),
});

export const pageElementSchema = z.object({
  accessibleName: z.string().nullable(),
  auraId: z.string().min(1),
  category: pageElementCategorySchema,
  childCount: z.number().int().nonnegative(),
  display: z.string().nullable(),
  fontSizePx: z.number().nonnegative().nullable(),
  fontWeight: z.string().nullable(),
  formAuraId: z.string().nullable(),
  headingLevel: z.number().int().min(1).max(9).nullable(),
  href: z.string().nullable(),
  inViewport: z.boolean(),
  inputType: z.string().nullable(),
  interactive: z.boolean(),
  landmark: z.string().nullable(),
  lineHeightPx: z.number().nonnegative().nullable(),
  position: z.string().nullable(),
  rect: pageRectSchema.nullable(),
  repetitionKey: z.string().nullable(),
  role: z.string().nullable(),
  score: z.number(),
  states: pageElementStateSchema,
  tag: z.string().min(1),
  text: z.string().nullable(),
  textLength: z.number().int().nonnegative(),
  visible: z.boolean(),
});

export const pageRegionSchema = z.object({
  accessibleName: z.string().nullable(),
  auraId: z.string().min(1),
  inViewport: z.boolean(),
  landmark: z.string().nullable(),
  rect: pageRectSchema.nullable(),
  role: z.string().nullable(),
  tag: z.string().min(1),
});

export const pageFormSchema = z.object({
  accessibleName: z.string().nullable(),
  auraId: z.string().min(1),
  controlAuraIds: z.array(z.string()),
  labeledControlCount: z.number().int().nonnegative(),
  totalControlCount: z.number().int().nonnegative(),
});

export const repeatedStructureSchema = z.object({
  category: pageElementCategorySchema,
  count: z.number().int().min(2),
  exampleNames: z.array(z.string()),
  key: z.string().min(1),
  representativeAuraIds: z.array(z.string()),
});

export const extractionHealthSchema = z.object({
  enoughTargets: z.boolean(),
  formLabelCoverage: z.number().min(0).max(1),
  hasHeading: z.boolean(),
  hasInteractive: z.boolean(),
  hasPrimaryRegion: z.boolean(),
  score: z.number().min(0).max(1),
});

export const pageModelMetricsSchema = z.object({
  candidateCount: z.number().int().nonnegative(),
  captureDurationMs: z.number().nonnegative(),
  mutationCount: z.number().int().nonnegative(),
  selectedCount: z.number().int().nonnegative(),
  trigger: z.enum(['dom-ready', 'manual', 'mutation', 'route-change']),
});

export const pageModelSchema = z.object({
  capturedAt: z.string(),
  elements: z.array(pageElementSchema),
  extractionHealth: extractionHealthSchema,
  forms: z.array(pageFormSchema),
  metrics: pageModelMetricsSchema,
  pageId: z.string().min(1),
  regions: z.array(pageRegionSchema),
  repeatedStructures: z.array(repeatedStructureSchema),
  revision: z.number().int().positive(),
  schemaVersion: z.literal(1),
  title: z.string(),
  url: z.string(),
  viewport: z.object({
    height: z.number().nonnegative(),
    scrollX: z.number(),
    scrollY: z.number(),
    width: z.number().nonnegative(),
  }),
  visibleAuraIds: z.array(z.string()),
});

export const screenshotMetadataSchema = z.object({
  byteLength: z.number().int().nonnegative(),
  capturedAt: z.string().nullable(),
  durationMs: z.number().nonnegative().nullable(),
  error: z.string().nullable(),
  height: z.number().int().nonnegative(),
  status: z.enum(['failed', 'pending', 'ready']),
  width: z.number().int().nonnegative(),
});

export const pageIntelligenceStateSchema = z.object({
  model: pageModelSchema,
  screenshot: screenshotMetadataSchema,
});

export const pageRuntimeCommandSchema = z.discriminatedUnion('type', [
  z.object({
    auraId: z.string().min(1),
    pageId: z.string().min(1),
    revision: z.number().int().positive(),
    type: z.literal('highlight-target'),
  }),
  z.object({
    auraId: z.string().min(1),
    pageId: z.string().min(1),
    revision: z.number().int().positive(),
    type: z.literal('scroll-target'),
  }),
  z.object({
    pageId: z.string().min(1),
    revision: z.number().int().positive(),
    type: z.literal('capture-now'),
  }),
]);

export type ExtractionHealth = z.infer<typeof extractionHealthSchema>;
export type PageElement = z.infer<typeof pageElementSchema>;
export type PageElementCategory = z.infer<typeof pageElementCategorySchema>;
export type PageForm = z.infer<typeof pageFormSchema>;
export type PageIntelligenceState = z.infer<
  typeof pageIntelligenceStateSchema
>;
export type PageModel = z.infer<typeof pageModelSchema>;
export type PageModelMetrics = z.infer<typeof pageModelMetricsSchema>;
export type PageRect = z.infer<typeof pageRectSchema>;
export type PageRegion = z.infer<typeof pageRegionSchema>;
export type PageRuntimeCommand = z.infer<typeof pageRuntimeCommandSchema>;
export type RepeatedStructureSummary = z.infer<
  typeof repeatedStructureSchema
>;
export type ScreenshotMetadata = z.infer<typeof screenshotMetadataSchema>;
