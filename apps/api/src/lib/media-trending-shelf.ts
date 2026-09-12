import type {
  MediaTrendingItem,
  MediaTrendingShelf,
  MediaTrendingShelfMeta,
} from "@questorylabs/shared";
import { CacheService } from "../cache/cache.service";

export const MEDIA_TRENDING_TOP_N = 20;
export const MEDIA_TRENDING_CACHE_TTL_SEC = 1800;

export function emptyMediaShelf(
  meta: MediaTrendingShelfMeta,
): MediaTrendingShelf {
  return { items: [], meta };
}

export function capMediaItems<T>(items: T[], n = MEDIA_TRENDING_TOP_N): T[] {
  return items.slice(0, n);
}

export function withCachedFlag(
  shelf: MediaTrendingShelf,
  cached: boolean,
): MediaTrendingShelf {
  return { ...shelf, meta: { ...shelf.meta, cached } };
}

/**
 * Cache successful shelves only. `load` returning null means a transient
 * failure (429/network) — serve an empty shelf and do not store it.
 */
export async function cachedMediaShelf(
  cache: CacheService,
  key: string,
  empty: MediaTrendingShelf,
  load: () => Promise<MediaTrendingShelf | null>,
  ttlSeconds = MEDIA_TRENDING_CACHE_TTL_SEC,
): Promise<MediaTrendingShelf> {
  const hit = await cache.getJson<MediaTrendingShelf>(key);
  if (hit) return withCachedFlag(hit, true);

  const loaded = await load();
  if (loaded == null) return withCachedFlag(empty, false);

  const capped: MediaTrendingShelf = {
    ...loaded,
    items: capMediaItems(loaded.items),
  };
  await cache.setJson(key, capped, ttlSeconds);
  return withCachedFlag(capped, false);
}

export function rankItems(
  items: Omit<MediaTrendingItem, "rank">[],
): MediaTrendingItem[] {
  return items.map((item, i) => ({ ...item, rank: i + 1 }));
}
