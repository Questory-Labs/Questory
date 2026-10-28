import { z } from "zod";

export const GOAL_DOMAINS = ["games", "music", "watch", "read"] as const;
export const GoalDomainSchema = z.enum(GOAL_DOMAINS);
export type GoalDomain = z.infer<typeof GoalDomainSchema>;

export const GOAL_TIMEFRAMES = ["week", "month", "year"] as const;
export const GoalTimeframeSchema = z.enum(GOAL_TIMEFRAMES);
export type GoalTimeframe = z.infer<typeof GoalTimeframeSchema>;

export const GOAL_STATUSES = ["active", "done", "all"] as const;
export const GoalStatusSchema = z.enum(GOAL_STATUSES);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const GOAL_KIND_DAILY_LISTENS = "daily_listens";
export const GOAL_LIST_DEFAULT_LIMIT = 50;
export const GOAL_LIST_MAX_LIMIT = 100;

export const GoalSchema = z.object({
  id: z.string(),
  domain: GoalDomainSchema,
  kind: z.string(),
  name: z.string(),
  targetRef: z.string().nullable(),
  targetValue: z.number().nullable(),
  progressValue: z.number(),
  estimatedMinutes: z.number().int().nullable(),
  timeframe: GoalTimeframeSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  acceptedAt: z.string(),
  doneAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalListQuerySchema = z.object({
  domain: GoalDomainSchema.optional(),
  status: GoalStatusSchema.optional().default("active"),
  timeframe: GoalTimeframeSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GOAL_LIST_MAX_LIMIT)
    .optional()
    .default(GOAL_LIST_DEFAULT_LIMIT),
});
export type GoalListQuery = z.infer<typeof GoalListQuerySchema>;

export const GoalListResponseSchema = z.object({
  items: z.array(GoalSchema),
});
export type GoalListResponse = z.infer<typeof GoalListResponseSchema>;

export const GoalCreateSchema = z.object({
  kind: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  domain: GoalDomainSchema,
  estimatedMinutes: z.number().int().min(0).max(1_000_000).nullable().optional(),
  targetRef: z.string().trim().min(1).max(200).nullable().optional(),
  targetValue: z.number().min(0).max(1_000_000).nullable().optional(),
  timeframe: GoalTimeframeSchema,
  tz: z.string().max(64).optional(),
});
export type GoalCreate = z.infer<typeof GoalCreateSchema>;

export const GoalUpdateSchema = z
  .object({
    done: z.boolean().optional(),
    progressValue: z.number().min(0).max(1_000_000).optional(),
  })
  .refine((v) => v.done !== undefined || v.progressValue !== undefined, {
    message: "Provide done or progressValue",
  });
export type GoalUpdate = z.infer<typeof GoalUpdateSchema>;

export const GoalDeleteResultSchema = z.object({ ok: z.literal(true) });
export type GoalDeleteResult = z.infer<typeof GoalDeleteResultSchema>;
