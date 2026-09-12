import { z } from "zod";

export const MediaTrendingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  subtitle: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  rank: z.number().optional(),
  listenCount: z.number().optional(),
});
export type MediaTrendingItem = z.infer<typeof MediaTrendingItemSchema>;

export const MediaTrendingShelfMetaSchema = z.object({
  source: z.string(),
  windowLabel: z.string(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  cached: z.boolean().optional(),
});
export type MediaTrendingShelfMeta = z.infer<typeof MediaTrendingShelfMetaSchema>;

export const MediaTrendingShelfSchema = z.object({
  items: z.array(MediaTrendingItemSchema),
  meta: MediaTrendingShelfMetaSchema,
});
export type MediaTrendingShelf = z.infer<typeof MediaTrendingShelfSchema>;
