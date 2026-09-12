import { z } from "zod";

export const WeeklyDigestDomainSchema = z.enum([
  "games",
  "music",
  "watch",
  "read",
]);
export type WeeklyDigestDomain = z.infer<typeof WeeklyDigestDomainSchema>;

export const WeeklyDigestItemSchema = z.object({
  domain: WeeklyDigestDomainSchema,
  name: z.string(),
  reason: z.string(),
  chartLabel: z.string(),
});
export type WeeklyDigestItem = z.infer<typeof WeeklyDigestItemSchema>;

export const WeeklyDigestSchema = z.object({
  weekId: z.string(),
  from: z.string(),
  to: z.string(),
  headline: z.string(),
  body: z.string(),
  items: z.array(WeeklyDigestItemSchema),
  llmPolished: z.boolean(),
});
export type WeeklyDigest = z.infer<typeof WeeklyDigestSchema>;

export const WeeklyDigestViewSchema = z.object({
  cached: z.boolean(),
  generating: z.boolean(),
  result: WeeklyDigestSchema.nullable().optional(),
});
export type WeeklyDigestView = z.infer<typeof WeeklyDigestViewSchema>;

/** Nest → QEngine weekly-digest POST body. Extra context keys are allowed. */
export const WeeklyDigestRequestSchema = z.object({
  context: z
    .object({
      localHour: z.number().int().min(0).max(23).optional(),
      localWeekday: z.number().int().min(0).max(6).optional(),
      timeZone: z.string().min(1).optional(),
      mood: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
export type WeeklyDigestRequest = z.infer<typeof WeeklyDigestRequestSchema>;
