import type {
  MusicListenSource,
  MusicRange,
  MusicRecentListen,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { formatMinutes } from "@/lib/music";

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_WINDOWS: Array<[MusicRange, number]> = [
  ["week", 7 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["year", 365 * DAY_MS],
];

export const dayTotalsRange = (
  oldestIso: string | null | undefined,
  now = Date.now(),
): MusicRange => {
  if (!oldestIso) return "week";
  const start = new Date(oldestIso);
  start.setHours(0, 0, 0, 0);
  const age = now - start.getTime();
  return RANGE_WINDOWS.find(([, span]) => age <= span)?.[0] ?? "all";
};

export const mergeListens = (
  current: MusicRecentListen[],
  incoming: MusicRecentListen[],
) => {
  const seen = new Set(current.map((l) => l.id));
  return [...current, ...incoming.filter((l) => !seen.has(l.id))];
};

export const daySummary = (bucket: MusicTimeBucket | undefined) => {
  if (!bucket) return null;
  const listens = `${bucket.count.toLocaleString()} ${bucket.count === 1 ? "listen" : "listens"}`;
  const minutes = Math.round(bucket.minutes ?? 0);
  return minutes > 0 ? `${listens} · ${formatMinutes(minutes)}` : listens;
};

export const listenSourceOf = (
  submissionClient: string | null | undefined,
): MusicListenSource => {
  if (submissionClient === "questory_lastfm") return "lastfm";
  if (submissionClient?.endsWith("_import")) return "imports";
  return "listenbrainz";
};

export const recentPath = (params: {
  page: number;
  pageSize: number;
  q: string;
  source: MusicListenSource | "all";
}) => {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) qs.set("q", params.q);
  if (params.source !== "all") qs.set("source", params.source);
  return `/analytics/recent?${qs.toString()}`;
};
