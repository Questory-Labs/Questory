import { z } from "zod";

export const READ_PROGRESS_CHAPTER_MAX = 100000;
export const READ_PROGRESS_VOLUME_MAX = 10000;

export const ReadProgressBodySchema = z.object({
  chapter: z.number().int().min(0).max(READ_PROGRESS_CHAPTER_MAX),
  volume: z.number().int().min(0).max(READ_PROGRESS_VOLUME_MAX).optional(),
});
export type ReadProgressBody = z.infer<typeof ReadProgressBodySchema>;

export const ReadProgressResultSchema = z.object({
  id: z.string(),
  readTitleId: z.string(),
  chapter: z.number(),
  volume: z.number().nullable(),
  chaptersRead: z.number(),
  listStatus: z.string(),
});
export type ReadProgressResult = z.infer<typeof ReadProgressResultSchema>;

export const ReadTitleTimeseriesSchema = z.object({
  granularity: z.literal("week"),
  weeks: z.number(),
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      count: z.number(),
    }),
  ),
});
export type ReadTitleTimeseries = z.infer<typeof ReadTitleTimeseriesSchema>;

export const ProviderDisconnectResultSchema = z.object({
  ok: z.literal(true),
  disconnected: z.boolean(),
});
export type ProviderDisconnectResult = z.infer<
  typeof ProviderDisconnectResultSchema
>;

export const SourceDomainSchema = z.enum(["music", "watch", "read"]);
export type SourceDomain = z.infer<typeof SourceDomainSchema>;

export const SourceProviderStatusSchema = z.object({
  provider: z.string(),
  kind: z.enum(["connection", "api_key"]),
  connected: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  account: z.string().nullable(),
});
export type SourceProviderStatus = z.infer<typeof SourceProviderStatusSchema>;

export const SourcesDomainSchema = z.object({
  domain: SourceDomainSchema,
  connected: z.number(),
  providers: z.array(SourceProviderStatusSchema),
});
export type SourcesDomain = z.infer<typeof SourcesDomainSchema>;

export const SourcesOverviewSchema = z.object({
  connected: z.number(),
  domains: z.array(SourcesDomainSchema),
});
export type SourcesOverview = z.infer<typeof SourcesOverviewSchema>;
