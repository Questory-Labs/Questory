import { normalizeName } from "../lib/normalize";

export type ManualProviderHit = {
  name: string;
  year: number | null;
  type: "movie" | "show";
  posterUrl: string | null;
  tmdbId?: number;
  anilistId?: number;
  originCountry?: string;
  sources: Array<"tmdb" | "anilist">;
};

function matchKey(hit: ManualProviderHit): string {
  return `${hit.type}:${hit.year ?? ""}:${normalizeName(hit.name)}`;
}

/** Collapse TMDB + AniList rows that share type, year, and normalized name. */
export function mergeSearchHits(
  tmdb: ManualProviderHit[],
  anilist: ManualProviderHit[],
  limit: number,
): ManualProviderHit[] {
  const tmdbByKey = new Map<string, ManualProviderHit>();
  for (const hit of tmdb) {
    tmdbByKey.set(matchKey(hit), hit);
  }

  const merged: ManualProviderHit[] = [];
  const consumedTmdb = new Set<string>();

  for (const al of anilist) {
    const key = matchKey(al);
    const tmdbHit = tmdbByKey.get(key);
    if (tmdbHit) {
      consumedTmdb.add(key);
      merged.push({
        name: al.name,
        year: al.year ?? tmdbHit.year,
        type: al.type,
        posterUrl: al.posterUrl ?? tmdbHit.posterUrl,
        tmdbId: tmdbHit.tmdbId,
        anilistId: al.anilistId,
        originCountry: tmdbHit.originCountry,
        sources: ["tmdb", "anilist"],
      });
      continue;
    }
    merged.push(al);
  }

  const leftoverTmdb = tmdb.filter((hit) => !consumedTmdb.has(matchKey(hit)));
  return [...leftoverTmdb, ...merged].slice(0, limit);
}

export function searchHitId(hit: ManualProviderHit): string {
  if (hit.tmdbId != null && hit.anilistId != null) {
    return `tmdb:${hit.tmdbId}:al:${hit.anilistId}`;
  }
  if (hit.tmdbId != null) return `tmdb:${hit.tmdbId}`;
  return `anilist:${hit.anilistId}`;
}
