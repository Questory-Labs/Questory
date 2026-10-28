import type {
  RewindAllStats,
  RewindCommonExtras,
  RewindStatsResponse,
} from "@questorylabs/shared";
import {
  bucketLabel,
  formatCount,
  formatHours,
  hoursValue,
  longPeriodLabel,
  priorLabel,
  signedPct,
} from "./media.rewind.format";
import {
  allSummary,
  gamesSummary,
  musicSummary,
  readSummary,
  watchSummary,
} from "./media.rewind.summary-domains";
import type { RewindBar, RewindHeroModel, RewindSummary } from "./media.rewind.summary.types";

type Point = { key: string; value: number; topItem?: string | null };

const periodKeys = (period: string): { keys: string[]; daily: boolean } => {
  const [y, m] = period.split("-").map(Number);
  if (!y) return { keys: [], daily: false };
  if (m) {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const prefix = `${y}-${String(m).padStart(2, "0")}`;
    return {
      keys: Array.from({ length: days }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`),
      daily: true,
    };
  }
  return {
    keys: Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`),
    daily: false,
  };
};

const isWeekend = (key: string): boolean => {
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

export const rewindBars = (
  period: string,
  points: Point[],
): { bars: RewindBar[]; daily: boolean; peak: string | null } => {
  if (!points.some((p) => p.value > 0)) return { bars: [], daily: false, peak: null };
  const { keys, daily } = periodKeys(period);
  const byKey = new Map(points.map((p) => [p.key, p]));
  const ordered = keys.length && keys.some((k) => byKey.has(k)) ? keys : points.map((p) => p.key);
  const bars = ordered.map((key) => ({
    key,
    label: bucketLabel(key),
    value: byKey.get(key)?.value ?? 0,
    weekend: daily && isWeekend(key),
  }));
  const peakPoint = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]!);
  const peak = `Peak ${bucketLabel(peakPoint.key)}${peakPoint.topItem ? ` · mostly ${peakPoint.topItem}` : ""}`;
  return { bars, daily, peak };
};

const monthlyPoints = (stats: RewindCommonExtras): Point[] =>
  (stats.monthly ?? []).map((b) => ({ key: b.month, value: b.count, topItem: b.topItem }));

const allPoints = (stats: RewindAllStats): Point[] => {
  const daily = stats.daily ?? [];
  const max: Record<string, number> = {};
  for (const row of daily) {
    for (const [domain, n] of Object.entries(row.counts)) {
      max[domain] = Math.max(max[domain] ?? 0, n ?? 0);
    }
  }
  return daily.map((row) => ({
    key: row.date,
    value: Object.entries(row.counts).reduce(
      (sum, [domain, n]) => sum + (max[domain] ? (n ?? 0) / max[domain]! : 0),
      0,
    ),
  }));
};

const priorNote = (stats: RewindCommonExtras, period: string): string | null => {
  const prior = stats.prior?.coverage ? stats.prior : undefined;
  return prior && prior.deltaPct !== null
    ? `${signedPct(prior.deltaPct)} vs ${priorLabel(period)}`
    : null;
};

const joinNote = (...parts: (string | null | undefined | false)[]): string =>
  parts.filter(Boolean).join(" · ");

const AREA_NAMES = { games: "games", music: "music", watch: "watching", read: "reading" } as const;

const allHero = (stats: RewindAllStats): Omit<RewindHeroModel, "bars" | "daily" | "peak"> => {
  const { music, watch, read, games } = stats.domains;
  const minutes =
    (music?.listeningMinutes ?? 0) + (watch?.watchingMinutes ?? 0) + (games?.totalMinutes ?? 0);
  const areas = (Object.keys(AREA_NAMES) as (keyof typeof AREA_NAMES)[])
    .filter((key) => stats.domains[key])
    .map((key) => AREA_NAMES[key]);
  if (!areas.length) {
    return { label: "Time across everything", value: 0, decimals: 0, unit: "h", note: "No activity in this period yet." };
  }
  const since = stats.busiestSince ? `Busiest month since ${longPeriodLabel(stats.busiestSince)}.` : null;
  if (minutes <= 0 && read) {
    return { label: "Chapters logged", value: read.chaptersLogged, decimals: 0, unit: "", note: joinNote(since) };
  }
  const { value, decimals } = hoursValue(minutes);
  return {
    label: "Time across everything",
    value,
    decimals,
    unit: "h",
    note: joinNote(since ?? `Across ${areas.join(", ")}.`),
  };
};

const domainHero = (
  stats: Exclude<RewindStatsResponse, RewindAllStats>,
): Omit<RewindHeroModel, "bars" | "daily" | "peak"> => {
  const delta = priorNote(stats, stats.period);
  switch (stats.domain) {
    case "games": {
      const { value, decimals } = hoursValue(stats.totalMinutes);
      return {
        label: "Hours played",
        value,
        decimals,
        unit: "h",
        note: joinNote(`${formatCount(stats.uniqueGames)} ${stats.uniqueGames === 1 ? "game" : "games"}`, delta),
      };
    }
    case "music":
      return {
        label: "Total plays",
        value: stats.totalPlays,
        decimals: 0,
        unit: "",
        note: joinNote(`${formatHours(stats.listeningMinutes).replace(/h$/, "")} hours listened`, delta),
      };
    case "watch":
      return {
        label: "Total watches",
        value: stats.totalWatches,
        decimals: 0,
        unit: "",
        note: joinNote(`${formatHours(stats.watchingMinutes).replace(/h$/, "")} hours watched`, delta),
      };
    case "read":
      return {
        label: "Chapters logged",
        value: stats.chaptersLogged,
        decimals: 0,
        unit: "",
        note: joinNote(`across ${formatCount(stats.uniqueTitles)} ${stats.uniqueTitles === 1 ? "title" : "titles"}`, delta),
      };
  }
};

export const buildRewindSummary = (stats: RewindStatsResponse): RewindSummary => {
  if (stats.domain === "all") {
    return {
      hero: { ...allHero(stats), ...rewindBars(stats.period, allPoints(stats)) },
      ...allSummary(stats),
    };
  }
  const hero = { ...domainHero(stats), ...rewindBars(stats.period, monthlyPoints(stats)) };
  switch (stats.domain) {
    case "games":
      return { hero, ...gamesSummary(stats) };
    case "music":
      return { hero, ...musicSummary(stats) };
    case "watch":
      return { hero, ...watchSummary(stats) };
    case "read":
      return { hero, ...readSummary(stats) };
  }
};
