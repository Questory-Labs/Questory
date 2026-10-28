import type { MusicListenSource } from "@questorylabs/shared";

export const LISTEN_SOURCE_OPTIONS: { value: MusicListenSource | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "lastfm", label: "Last.fm" },
  { value: "listenbrainz", label: "ListenBrainz" },
  { value: "imports", label: "Imports" },
];

const SOURCE_LABELS: Record<string, string> = {
  lastfm: "Last.fm",
  listenbrainz: "ListenBrainz",
};

export const playingSourceLabel = (source: string | null | undefined) =>
  source ? (SOURCE_LABELS[source] ?? source) : null;

export const RANGE_EYEBROW = {
  day: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
} as const;

export const RANGE_PERIOD = {
  day: "today",
  week: "this week",
  month: "this month",
  year: "this year",
  all: "all time",
} as const;

export const RANGE_PREVIOUS = {
  day: "yesterday",
  week: "last week",
  month: "last month",
  year: "last year",
  all: "",
} as const;

export const listeningPhrase = (hour: number | null | undefined) => {
  if (hour == null) return "and counting";
  if (hour >= 21 || hour < 4) return "mostly after dark";
  if (hour < 12) return "mostly in the morning";
  if (hour < 17) return "mostly in the afternoon";
  return "mostly in the evening";
};

export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const playbackProgress = (
  startedAt: string,
  durationMs: number,
  now: number,
) => {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started) || durationMs <= 0) return null;
  const elapsedMs = Math.min(durationMs, Math.max(0, now - started));
  return { elapsedMs, durationMs, ratio: elapsedMs / durationMs };
};

export const formatHours = (minutes: number) =>
  minutes >= 600 ? String(Math.round(minutes / 60)) : (minutes / 60).toFixed(1);

export const initialOf = (name: string) =>
  (name.trim().match(/\p{L}|\p{N}/u)?.[0] ?? "♪").toUpperCase();

export const formatMonthYear = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};
