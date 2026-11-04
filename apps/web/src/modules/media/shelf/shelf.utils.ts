export type ShelfBar = { label: string; count: number };

export type ShelfShare = { key: string; label: string; count: number; pct: number };

export const peakIndex = (items: { count: number }[]): number => {
  let best = -1;
  let max = 0;
  items.forEach((item, i) => {
    if (item.count > max) {
      max = item.count;
      best = i;
    }
  });
  return best;
};

export const toShares = (
  items: { key: string; label: string; count: number }[],
  total: number,
): ShelfShare[] => {
  const sum = total > 0 ? total : items.reduce((a, i) => a + i.count, 0);
  return items.map((i) => ({
    ...i,
    pct: sum > 0 ? Math.round((i.count / sum) * 100) : 0,
  }));
};

export const progressFraction = (
  done: number | null | undefined,
  total: number | null | undefined,
): number | null => {
  if (done == null || total == null || total <= 0) return null;
  return Math.max(0, Math.min(1, done / total));
};

export const ratingDots = (rating: number | null | undefined, of = 5): boolean[] =>
  Array.from({ length: of }, (_, i) => rating != null && i < Math.round(rating));

export const splitHoursMinutes = (minutes: number) => ({
  hours: Math.floor(minutes / 60),
  minutes: Math.round(minutes % 60),
});

export const sourceLabel = (source: string): string => {
  const known: Record<string, string> = {
    trakt: "Trakt",
    anilist: "AniList",
    mal: "MyAnimeList",
    kitsu: "Kitsu",
    bangumi: "Bangumi",
    shikimori: "Shikimori",
    letterboxd: "Letterboxd",
    plex: "Plex",
    jellyfin: "Jellyfin",
    manual: "Manual",
    lastfm: "Last.fm",
  };
  return known[source] ?? source;
};

export const precisionLabel = (precision: string): string => {
  if (precision === "exact" || precision === "second") return "exact time";
  if (precision === "day" || precision === "date") return "date only";
  if (precision === "unknown") return "time unknown";
  return precision;
};
