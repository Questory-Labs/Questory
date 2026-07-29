export function normalizeLetterboxdName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export function watchedAtDayUtc(dateStr: string): Date | null {
  const watchedAt = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(watchedAt.getTime())) return null;
  return watchedAt;
}

export function watchedAtDateStr(watchedAt: Date): string {
  return watchedAt.toISOString().slice(0, 10);
}

export function letterboxdWatchDedupeKey(
  name: string,
  year: number | null | undefined,
  dateStr: string,
): string {
  const y = year != null && Number.isFinite(year) ? String(year) : "";
  return `letterboxd_csv:watch:${normalizeLetterboxdName(name)}:${y}:${dateStr}`;
}

export function letterboxdWatchDedupeKeyFromTitle(
  name: string,
  year: number | null | undefined,
  watchedAt: Date,
): string {
  return letterboxdWatchDedupeKey(name, year, watchedAtDateStr(watchedAt));
}

export type LegacyLetterboxdDedupe = {
  kind: "diary" | "watched";
  nameNorm: string;
  dateStr: string;
};

export function parseLegacyLetterboxdDedupeKey(
  dedupeKey: string,
): LegacyLetterboxdDedupe | null {
  const match = dedupeKey.match(
    /^letterboxd_csv:(diary|watched):([^:]+):(\d{4}-\d{2}-\d{2})$/,
  );
  if (!match) return null;
  return {
    kind: match[1] as LegacyLetterboxdDedupe["kind"],
    nameNorm: match[2],
    dateStr: match[3],
  };
}

type ParsedWatchDedupe = {
  nameNorm: string;
  year: string;
  dateStr: string;
};

function parseWatchDedupeKey(dedupeKey: string): ParsedWatchDedupe | null {
  const match = dedupeKey.match(
    /^letterboxd_csv:watch:([^:]+):([^:]*):(\d{4}-\d{2}-\d{2})$/,
  );
  if (!match) return null;
  return {
    nameNorm: match[1],
    year: match[2],
    dateStr: match[3],
  };
}

export function letterboxdRepairGroupKey(
  userId: string,
  dedupeKey: string,
  name: string,
  watchedAt: Date,
): string {
  const legacy = parseLegacyLetterboxdDedupeKey(dedupeKey);
  if (legacy) {
    return `${userId}:repair:${legacy.nameNorm}:${legacy.dateStr}`;
  }

  const watch = parseWatchDedupeKey(dedupeKey);
  if (watch) {
    return `${userId}:repair:${watch.nameNorm}:${watch.dateStr}`;
  }

  return `${userId}:fallback:${normalizeLetterboxdName(name)}:${watchedAtDateStr(watchedAt)}`;
}
