import { z } from "zod";

export const WatchCatalogSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});
export type WatchCatalogSearchQuery = z.infer<
  typeof WatchCatalogSearchQuerySchema
>;

export const WatchCatalogSearchSourceSchema = z.enum(["tmdb", "anilist"]);
export type WatchCatalogSearchSource = z.infer<
  typeof WatchCatalogSearchSourceSchema
>;

export const WatchCatalogSearchHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number().int().nullable(),
  type: z.enum(["movie", "show"]),
  posterUrl: z.string().nullable(),
  tmdbId: z.number().int().positive().optional(),
  anilistId: z.number().int().positive().optional(),
  sources: z.array(WatchCatalogSearchSourceSchema).min(1),
  originCountry: z.string().optional(),
});
export type WatchCatalogSearchHit = z.infer<typeof WatchCatalogSearchHitSchema>;

export const WatchCatalogSearchResponseSchema = z.object({
  items: z.array(WatchCatalogSearchHitSchema),
});
export type WatchCatalogSearchResponse = z.infer<
  typeof WatchCatalogSearchResponseSchema
>;

const halfStarRating = z
  .number()
  .min(0.5)
  .max(5)
  .multipleOf(0.5)
  .nullable()
  .optional();

export const WATCH_SEASON_NUMBER_MIN = 0;
export const WATCH_SEASON_NUMBER_MAX = 99;
export const WATCH_EPISODE_NUMBER_MIN = 1;
export const WATCH_EPISODE_NUMBER_MAX = 9999;

function isUtcCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const WatchCatalogLogSchema = z
  .object({
    tmdbId: z.number().int().positive().optional(),
    anilistId: z.number().int().positive().optional(),
    type: z.enum(["movie", "show"]),
    watchedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "watchedAt must be YYYY-MM-DD")
      .refine(isUtcCalendarDate, "watchedAt must be a valid calendar date"),
    rating: halfStarRating,
    seasonNumber: z
      .number()
      .int()
      .min(WATCH_SEASON_NUMBER_MIN)
      .max(WATCH_SEASON_NUMBER_MAX)
      .optional(),
    episodeNumber: z
      .number()
      .int()
      .min(WATCH_EPISODE_NUMBER_MIN)
      .max(WATCH_EPISODE_NUMBER_MAX)
      .optional(),
  })
  .refine((d) => d.tmdbId != null || d.anilistId != null, {
    message: "tmdbId or anilistId is required",
  })
  .refine(
    (d) =>
      d.type !== "show" ||
      (d.seasonNumber != null && d.episodeNumber != null),
    { message: "seasonNumber and episodeNumber are required for shows" },
  );
export type WatchCatalogLog = z.infer<typeof WatchCatalogLogSchema>;

export const WatchCatalogLogResultSchema = z.object({
  id: z.string(),
  titleId: z.string(),
  watchedAt: z.string(),
});
export type WatchCatalogLogResult = z.infer<typeof WatchCatalogLogResultSchema>;
