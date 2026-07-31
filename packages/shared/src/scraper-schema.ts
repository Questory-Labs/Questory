import { z } from "zod";

export const ScraperEngineSchema = z.enum(["cheerio", "playwright"]);
export type ScraperEngine = z.infer<typeof ScraperEngineSchema>;

export const ScraperFieldAttrSchema = z.enum([
  "text",
  "html",
  "href",
  "class",
  "attr",
]);
export type ScraperFieldAttr = z.infer<typeof ScraperFieldAttrSchema>;

export const ScraperFieldTransformSchema = z.enum([
  "date",
  "number",
  "stars",
  "slugFromHref",
  "ratedClass",
  "letterboxdDateHref",
]);
export type ScraperFieldTransform = z.infer<typeof ScraperFieldTransformSchema>;

export const ScraperFieldRuleSchema = z.object({
  name: z.string().min(1).max(64),
  selector: z.string().min(1).max(512),
  attr: ScraperFieldAttrSchema.default("text"),
  /** Used when attr is "attr" (e.g. data-film-id). */
  attrName: z.string().max(64).optional(),
  regex: z.string().max(256).optional(),
  transform: ScraperFieldTransformSchema.optional(),
});
export type ScraperFieldRule = z.infer<typeof ScraperFieldRuleSchema>;

export const ScraperPaginationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("nextLink"),
    nextSelector: z.string().min(1).max(512),
  }),
  z.object({
    type: z.literal("urlTemplate"),
    urlTemplate: z.string().min(1).max(2048),
  }),
]);
export type ScraperPagination = z.infer<typeof ScraperPaginationSchema>;

export const ScraperLimitsSchema = z.object({
  maxPages: z.number().int().min(1).max(500).default(50),
  maxRequestsPerMinute: z.number().int().min(1).max(600).default(30),
  requestDelayMs: z.number().int().min(0).max(60_000).default(1000),
  maxRetries: z.number().int().min(0).max(10).default(3),
});
export type ScraperLimits = z.infer<typeof ScraperLimitsSchema>;

export const ScraperStopSchema = z.object({
  onKnownEntry: z.boolean().default(true),
});
export type ScraperStop = z.infer<typeof ScraperStopSchema>;

export const ScraperDefinitionSchema = z.object({
  engine: ScraperEngineSchema,
  startUrl: z.string().min(1).max(2048),
  userAgent: z.string().max(512).optional(),
  headers: z.record(z.string().max(512)).optional(),
  limits: ScraperLimitsSchema.default({}),
  itemSelector: z.string().min(1).max(512),
  fields: z.array(ScraperFieldRuleSchema).min(1).max(32),
  pagination: ScraperPaginationSchema.default({ type: "none" }),
  stop: ScraperStopSchema.default({}),
});
export type ScraperDefinition = z.infer<typeof ScraperDefinitionSchema>;

export const ScraperIterationStatusSchema = z.enum([
  "draft",
  "validated",
  "published",
  "archived",
]);
export type ScraperIterationStatus = z.infer<
  typeof ScraperIterationStatusSchema
>;

export const ScraperIterationRecordSchema = z.object({
  id: z.string(),
  providerKey: z.string(),
  version: z.number().int().positive(),
  status: ScraperIterationStatusSchema,
  label: z.string().nullable(),
  config: ScraperDefinitionSchema,
  validatedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScraperIterationRecord = z.infer<
  typeof ScraperIterationRecordSchema
>;

export const ScraperProviderSummarySchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  hasPublished: z.boolean(),
  hasOpenIteration: z.boolean(),
});
export type ScraperProviderSummary = z.infer<
  typeof ScraperProviderSummarySchema
>;

export const ScraperProviderDetailSchema = ScraperProviderSummarySchema.extend({
  current: ScraperIterationRecordSchema.nullable(),
  previous: z.array(ScraperIterationRecordSchema),
  openIteration: ScraperIterationRecordSchema.nullable(),
});
export type ScraperProviderDetail = z.infer<
  typeof ScraperProviderDetailSchema
>;

export const ScraperIterationBodySchema = z.object({
  label: z.string().max(128).optional(),
  config: ScraperDefinitionSchema,
});
export type ScraperIterationBody = z.infer<
  typeof ScraperIterationBodySchema
>;

export const ScraperConfigBodySchema = z.object({
  name: z.string().min(1).max(128),
  sourceKey: z.string().min(1).max(64),
  enabled: z.boolean().default(true),
  config: ScraperDefinitionSchema,
});
export type ScraperConfigBody = z.infer<typeof ScraperConfigBodySchema>;

export const ScraperConfigRecordSchema = ScraperConfigBodySchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScraperConfigRecord = z.infer<typeof ScraperConfigRecordSchema>;

export const ScraperTestRequestSchema = z.object({
  macros: z.record(z.string()).default({}),
  maxPages: z.number().int().min(1).max(5).default(1),
});
export type ScraperTestRequest = z.infer<typeof ScraperTestRequestSchema>;

export const ScraperTestResponseSchema = z.object({
  pages: z.array(
    z.object({
      page: z.number(),
      url: z.string(),
      rows: z.array(z.record(z.string().nullable())),
    }),
  ),
});
export type ScraperTestResponse = z.infer<typeof ScraperTestResponseSchema>;
