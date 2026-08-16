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

export const WatchCatalogLogSchema = z
  .object({
    tmdbId: z.number().int().positive().optional(),
    anilistId: z.number().int().positive().optional(),
    type: z.enum(["movie", "show"]),
    watchedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "watchedAt must be YYYY-MM-DD"),
    rating: halfStarRating,
    seasonNumber: z.number().int().min(0).max(99).optional(),
    episodeNumber: z.number().int().min(1).max(9999).optional(),
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
