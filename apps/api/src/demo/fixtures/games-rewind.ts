import type {
  RewindAllDailyBucket,
  RewindAllStats,
  RewindGamesStats,
  RewindInsightResponse,
  RewindMonthBucket,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import { LIBRARY_GAMES, ownedProfile, textParam } from "./games-catalog";
import { DEMO_GAMES, steamHeaderUrl } from "./helpers";
import { musicRoutes } from "./music";
import { readRoutes } from "./read";
import { watchRoutes } from "./watch";

const PERIOD_RE = /^\d{4}(-\d{2})?$/;
const TOP_GAME_LIMIT = 5;
const TOP_GENRE_LIMIT = 4;

const PLAYED = LIBRARY_GAMES.filter((game) => game.minutes > 0).sort(
  (a, b) => b.minutes - a.minutes,
);

function previousMonth(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return date.toISOString().slice(0, 7);
}

function resolvePeriod(query: Record<string, unknown>): string {
  const period = textParam(query.period);
  return PERIOD_RE.test(period) ? period : previousMonth();
}

function periodKeys(period: string): string[] {
  const [year, month] = period.split("-").map(Number);
  if (month === undefined) {
    return Array.from({ length: 12 }, (_, index) =>
      `${year}-${String(index + 1).padStart(2, "0")}`,
    );
  }
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) =>
    `${period}-${String(index + 1).padStart(2, "0")}`,
  );
}

function isFutureKey(key: string, now: string): boolean {
  return key.slice(0, Math.min(key.length, now.length)) > now.slice(0, key.length);
}

function bucketMinutes(index: number, yearly: boolean): number {
  const base = [95, 0, 140, 60, 210, 0, 75, 180, 45, 0, 120, 260, 30][index % 13];
  return yearly ? (base + 120) * 7 : base;
}

function monthlyBuckets(period: string): RewindMonthBucket[] {
  const yearly = !period.includes("-");
  const today = new Date().toISOString().slice(0, 10);
  return periodKeys(period).map((month, index) => {
    const count = isFutureKey(month, today) ? 0 : bucketMinutes(index, yearly);
    return {
      month,
      count,
      topItem: count > 0 ? PLAYED[index % PLAYED.length].name : null,
    };
  });
}

function dayKey(bucket: string): string {
  return bucket.length === 10 ? bucket : `${bucket}-14`;
}

function gamesRewindStats(period: string): RewindGamesStats {
  const monthly = monthlyBuckets(period);
  const totalMinutes = monthly.reduce((sum, bucket) => sum + bucket.count, 0);
  const active = monthly.filter((bucket) => bucket.count > 0);
  const busiest = active.reduce<RewindMonthBucket | null>(
    (best, bucket) => (best && best.count >= bucket.count ? best : bucket),
    null,
  );
  const shares = [0.34, 0.24, 0.18, 0.14, 0.1];
  const topGames = PLAYED.slice(0, TOP_GAME_LIMIT).map((game, index) => ({
    id: String(game.appId),
    name: game.name,
    count: Math.round(totalMinutes * shares[index]),
    imageUrl: steamHeaderUrl(game.appId),
    subtitle: game.genres[0],
  }));
  const genreTotals = new Map<string, number>();
  for (const game of topGames) {
    const genre = game.subtitle ?? "Other";
    genreTotals.set(genre, (genreTotals.get(genre) ?? 0) + game.count);
  }
  const lead = PLAYED[0];
  return {
    domain: "games",
    period,
    totalMinutes,
    sessions: Math.round(totalMinutes / 82),
    sessionsAvailable: true,
    uniqueGames: PLAYED.length,
    newGames: 1,
    topGames,
    topGenres: [...genreTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_GENRE_LIMIT)
      .map(([name, count]) => ({ id: name.toLowerCase(), name, count })),
    longestSession: busiest
      ? { name: lead.name, minutes: 240, date: dayKey(busiest.month) }
      : null,
    lateNightShare: 18,
    peakHour: { index: 21, label: "9pm", count: 14 },
    peakDow: { index: 6, label: "Sat", count: 11 },
    backlog: LIBRARY_GAMES.filter((game) => ownedProfile(game.appId).status === "backlog").length,
    abandoned: [
      {
        id: String(DEMO_GAMES[2].appId),
        name: DEMO_GAMES[2].name,
        count: 180,
        imageUrl: steamHeaderUrl(DEMO_GAMES[2].appId),
        subtitle: null,
      },
    ],
    achievementsInPeriod: 23,
    perfectGames: 1,
    activeDays: active.length,
    longestStreakDays: 6,
    longestGapDays: 3,
    busiestDay: busiest ? { date: dayKey(busiest.month), count: busiest.count } : null,
    monthly,
    prior: {
      total: Math.round(totalMinutes * 0.85),
      deltaPct: 18,
      newItems: 1,
      returningItems: PLAYED.length - 1,
      coverage: true,
    },
    droppedOff: [],
  };
}

function siblingStats(routes: readonly DemoRoute[], pattern: string, period: string): unknown {
  const route = routes.find((item) => item.method === "GET" && item.pattern === pattern);
  if (!route) return undefined;
  return route.respond({ exp: 0, params: {}, query: { period }, body: undefined });
}

function hasDomain<T extends string>(value: unknown, domain: T): value is { domain: T } {
  return typeof value === "object" && value !== null && (value as { domain?: unknown }).domain === domain;
}

function combineDaily(domains: RewindAllStats["domains"]): RewindAllDailyBucket[] {
  const byDate = new Map<string, RewindAllDailyBucket["counts"]>();
  for (const key of ["music", "watch", "read", "games"] as const) {
    for (const bucket of domains[key]?.monthly ?? []) {
      const counts = byDate.get(bucket.month) ?? {};
      counts[key] = (counts[key] ?? 0) + bucket.count;
      byDate.set(bucket.month, counts);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, counts }));
}

function allRewindStats(period: string): RewindAllStats {
  const domains: RewindAllStats["domains"] = { games: gamesRewindStats(period) };
  const music = siblingStats(musicRoutes, "/music/analytics/rewind/stats", period);
  const watch = siblingStats(watchRoutes, "/watch/analytics/rewind/stats", period);
  const read = siblingStats(readRoutes, "/read/analytics/rewind/stats", period);
  if (hasDomain(music, "music")) domains.music = music as NonNullable<RewindAllStats["domains"]["music"]>;
  if (hasDomain(watch, "watch")) domains.watch = watch as NonNullable<RewindAllStats["domains"]["watch"]>;
  if (hasDomain(read, "read")) domains.read = read as NonNullable<RewindAllStats["domains"]["read"]>;
  return { domain: "all", period, domains, daily: combineDaily(domains), busiestSince: null };
}

function gamesInsight(period: string): RewindInsightResponse {
  const [first, second] = PLAYED;
  return {
    period,
    content: [
      `<headline>**${first.name}** carried this stretch, with **${second.name}** close behind. You kept coming back to long sessions rather than sampling lots of new games.</headline>`,
      "<rhythm>Weekends did most of the work, and **Saturday nights around 9 PM** were your most reliable window.</rhythm>",
      "<worthtrying>Your backlog has two games you already paid for and have not launched. One free evening would start clearing it.</worthtrying>",
    ].join("\n\n"),
    generatedAt: new Date().toISOString(),
    cached: true,
  };
}

function allInsight(period: string): RewindInsightResponse {
  return {
    period,
    content: [
      "<headline>Games took the biggest share of your time this stretch, with music filling in the quieter evenings around them.</headline>",
      "<rhythm>Your busiest days stacked several hobbies together, usually **late in the week**.</rhythm>",
      "<worthtrying>Pick one unfinished title from any shelf and give it a single focused evening.</worthtrying>",
    ].join("\n\n"),
    generatedAt: new Date().toISOString(),
    cached: true,
  };
}

export const rewindRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/rewind/stats", respond: ({ query }) => allRewindStats(resolvePeriod(query)) },
  { method: "GET", pattern: "/rewind/ai", respond: ({ query }) => allInsight(resolvePeriod(query)) },
  { method: "GET", pattern: "/games/analytics/rewind/stats", respond: ({ query }) => gamesRewindStats(resolvePeriod(query)) },
  { method: "GET", pattern: "/games/analytics/rewind/ai", respond: ({ query }) => gamesInsight(resolvePeriod(query)) },
];
