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

/** Year-agnostic match key: normalized title + watched date. */
export function letterboxdWatchEquivKey(name: string, dateStr: string): string {
  return `${normalizeLetterboxdName(name)}:${dateStr}`;
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

export function letterboxdEquivKeyFromDedupeKey(
  dedupeKey: string,
  name: string,
  watchedAt: Date,
): string {
  const legacy = parseLegacyLetterboxdDedupeKey(dedupeKey);
  if (legacy) {
    return `${legacy.nameNorm}:${legacy.dateStr}`;
  }

  const watch = parseWatchDedupeKey(dedupeKey);
  if (watch) {
    return `${watch.nameNorm}:${watch.dateStr}`;
  }

  return letterboxdWatchEquivKey(name, watchedAtDateStr(watchedAt));
}

export function letterboxdRepairGroupKey(
  userId: string,
  dedupeKey: string,
  name: string,
  watchedAt: Date,
): string {
  const equivKey = letterboxdEquivKeyFromDedupeKey(dedupeKey, name, watchedAt);
  const legacy = parseLegacyLetterboxdDedupeKey(dedupeKey);
  const watch = parseWatchDedupeKey(dedupeKey);
  if (legacy || watch) {
    return `${userId}:repair:${equivKey}`;
  }

  return `${userId}:fallback:${equivKey}`;
}

export function letterboxdDateStrFromDedupeKey(
  dedupeKey: string,
  watchedAt: Date,
): string {
  const legacy = parseLegacyLetterboxdDedupeKey(dedupeKey);
  if (legacy) return legacy.dateStr;
  const watch = parseWatchDedupeKey(dedupeKey);
  if (watch) return watch.dateStr;
  return watchedAtDateStr(watchedAt);
}

export function shiftLetterboxdDateStr(
  dateStr: string,
  deltaDays: number,
): string | null {
  const at = watchedAtDayUtc(dateStr);
  if (!at) return null;
  const shifted = new Date(at.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return watchedAtDateStr(shifted);
}

/** Calendar date and ±1 day — for matching scrape timezone off-by-one bugs. */
export function letterboxdAdjacentDateStrs(dateStr: string): string[] {
  const prev = shiftLetterboxdDateStr(dateStr, -1);
  const next = shiftLetterboxdDateStr(dateStr, 1);
  return [dateStr, prev, next].filter((d): d is string => d != null);
}

export function letterboxdDatesOneDayApart(a: string, b: string): boolean {
  if (a === b) return false;
  const at = watchedAtDayUtc(a);
  const bt = watchedAtDayUtc(b);
  if (!at || !bt) return false;
  return Math.abs(at.getTime() - bt.getTime()) === 24 * 60 * 60 * 1000;
}

export type LetterboxdRepairEvent = {
  id: string;
  userId: string;
  dedupeKey: string;
  watchedAt: Date;
  source: string;
  title: { name: string };
};

export function letterboxdAdjacentScrapeCsvPair(
  a: LetterboxdRepairEvent,
  b: LetterboxdRepairEvent,
): boolean {
  const scrape = a.source === "letterboxd" ? a : b.source === "letterboxd" ? b : null;
  const csv =
    a.source === "letterboxd_csv"
      ? a
      : b.source === "letterboxd_csv"
        ? b
        : null;
  if (!scrape || !csv) return false;
  const dateA = letterboxdDateStrFromDedupeKey(a.dedupeKey, a.watchedAt);
  const dateB = letterboxdDateStrFromDedupeKey(b.dedupeKey, b.watchedAt);
  return letterboxdDatesOneDayApart(dateA, dateB);
}
