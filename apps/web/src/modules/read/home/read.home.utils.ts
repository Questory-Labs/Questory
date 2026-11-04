import type { ReadLibraryItem, ReadRange, SourcesOverview } from "@questorylabs/shared";
import { sourceLabel } from "@/modules/media/shelf/shelf.utils";

export const READ_HOME_DEFAULT_RANGE: ReadRange = "month";
export const READ_HOME_READING_LIMIT = 6;

export const READ_HOME_RANGES: { value: ReadRange; label: string; long: string }[] = [
  { value: "month", label: "30d", long: "last 30 days" },
  { value: "week", label: "7d", long: "last 7 days" },
  { value: "year", label: "365d", long: "last 365 days" },
  { value: "all", label: "All", long: "all time" },
];

export const rangeLong = (range: ReadRange): string =>
  READ_HOME_RANGES.find((r) => r.value === range)?.long ?? range;

export const dayPartPhrase = (hour: number | null | undefined): string | null => {
  if (hour == null) return null;
  if (hour < 5) return "mostly past midnight";
  if (hour < 12) return "mostly in the morning";
  if (hour < 17) return "mostly in the afternoon";
  if (hour < 21) return "mostly in the evening";
  return "mostly late at night";
};

export const readingProgressLabel = (item: ReadLibraryItem): string => {
  if (item.progressChapters > 0 || item.title.chapters != null) {
    return item.title.chapters != null
      ? `Ch. ${item.progressChapters} / ${item.title.chapters}`
      : `Ch. ${item.progressChapters}`;
  }
  if (item.title.volumes != null) return `Vol. ${item.progressVolumes} / ${item.title.volumes}`;
  return `Vol. ${item.progressVolumes}`;
};

export const readingPercent = (item: ReadLibraryItem): number | null => {
  if (item.title.chapters && item.title.chapters > 0) {
    return Math.min(100, Math.round((item.progressChapters / item.title.chapters) * 100));
  }
  if (item.title.volumes && item.title.volumes > 0) {
    return Math.min(100, Math.round((item.progressVolumes / item.title.volumes) * 100));
  }
  return null;
};

export const latestReadSync = (
  overview: SourcesOverview | null | undefined,
): { provider: string; at: string } | null => {
  const read = overview?.domains.find((d) => d.domain === "read");
  let best: { provider: string; at: string } | null = null;
  for (const p of read?.providers ?? []) {
    if (!p.connected || !p.lastSyncedAt) continue;
    if (!best || p.lastSyncedAt > best.at) best = { provider: sourceLabel(p.provider), at: p.lastSyncedAt };
  }
  return best;
};
