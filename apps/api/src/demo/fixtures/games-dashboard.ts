import type {
  DashboardStats,
  Goal,
  GoalListResponse,
  PlayNextItem,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import { demoGameKey } from "./enterprise-shared";
import {
  DEMO_CURRENCY,
  LIBRARY_GAMES,
  WISHLIST_GAMES,
  metaFor,
  ownedProfile,
  roundMoney,
  textParam,
} from "./games-catalog";
import { generateSessions } from "./games-sessions";
import { wishlistItems } from "./games-wishlist-cost";
import { DEMO_GAMES, DEMO_FRIENDS, daysAgo, daysAhead, steamHeaderUrl } from "./helpers";

const HOURS_PER_WEEK = 168;
const RECENT_LIMIT = 5;
const PLAY_NEXT_DEFAULT = 3;
const PLAY_NEXT_MAX = 12;
const GOAL_LIMIT_MAX = 50;
const DAY_SECS = 24 * 60 * 60;

type ZoneParts = { weekIndex: number; hour: number; dayKey: string };

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function zoneFormatter(tz: unknown): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = {
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: typeof tz === "string" && tz ? tz : "UTC",
    });
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
  }
}

function zoneParts(format: Intl.DateTimeFormat, date: Date): ZoneParts {
  const part = (type: string) =>
    format.formatToParts(date).find((item) => item.type === type)?.value ?? "";
  return {
    weekIndex: WEEKDAY_INDEX[part("weekday")] ?? 0,
    hour: Number(part("hour")) % 24,
    dayKey: `${part("year")}-${part("month")}-${part("day")}`,
  };
}

function timePlayed(tz: unknown) {
  const format = zoneFormatter(tz);
  const nowMs = Date.now();
  const now = zoneParts(format, new Date(nowMs));
  const weekStartMs =
    nowMs - (now.weekIndex * DAY_SECS + now.hour * 3600) * 1000 - (nowMs % 3_600_000);
  const priorWeekStartMs = weekStartMs - 7 * DAY_SECS * 1000;
  const weekHourlySecs = new Array<number>(HOURS_PER_WEEK).fill(0);
  let todaySecs = 0;
  let weekSecs = 0;
  let priorWeekSecs = 0;
  let monthSecs = 0;
  const monthKey = now.dayKey.slice(0, 7);
  for (const session of generateSessions(nowMs)) {
    const startMs = new Date(session.startedAt).getTime();
    const parts = zoneParts(format, new Date(startMs));
    if (parts.dayKey.slice(0, 7) === monthKey) monthSecs += session.durationSecs;
    if (startMs >= weekStartMs) {
      weekSecs += session.durationSecs;
      weekHourlySecs[parts.weekIndex * 24 + parts.hour] += session.durationSecs;
      if (parts.dayKey === now.dayKey) todaySecs += session.durationSecs;
    } else if (startMs >= priorWeekStartMs) {
      priorWeekSecs += session.durationSecs;
    }
  }
  return { todaySecs, weekSecs, monthSecs, priorWeekSecs, weekHourlySecs };
}

function recentlyPlayed() {
  return LIBRARY_GAMES.filter((game) => ownedProfile(game.appId).lastPlayedDays != null)
    .sort(
      (a, b) =>
        (ownedProfile(a.appId).lastPlayedDays ?? 0) - (ownedProfile(b.appId).lastPlayedDays ?? 0),
    )
    .slice(0, RECENT_LIMIT)
    .map((game) => ({
      appId: game.appId,
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      playtimeForever: game.minutes,
      lastPlayedAt: daysAgo(ownedProfile(game.appId).lastPlayedDays ?? 0),
    }));
}

function dashboardStats(tz: unknown): DashboardStats {
  const totalMinutes = LIBRARY_GAMES.reduce((sum, game) => sum + game.minutes, 0);
  const spent = LIBRARY_GAMES.reduce((sum, game) => sum + ownedProfile(game.appId).paid, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const nearCompletion = LIBRARY_GAMES.filter(
    (game) => ownedProfile(game.appId).unlocked / metaFor(game.appId).achievementTotal >= 0.8,
  ).length;
  return {
    librarySize: LIBRARY_GAMES.length,
    totalPlaytimeHours: totalHours,
    unplayedCount: LIBRARY_GAMES.filter((game) => game.minutes === 0).length,
    wishlistCount: WISHLIST_GAMES.length,
    activeFriends: DEMO_FRIENDS.length,
    nearCompletionCount: nearCompletion,
    currentSalesCount: wishlistItems().filter((item) => (item.discountPercent ?? 0) > 0).length,
    costPerHour: roundMoney(spent / totalHours),
    lifetimeAtCurrent: roundMoney(
      LIBRARY_GAMES.reduce((sum, game) => sum + metaFor(game.appId).price, 0),
    ),
    currency: DEMO_CURRENCY,
    recentlyPlayed: recentlyPlayed(),
    syncStatus: { status: "completed", type: "library-sync", error: null, finishedAt: daysAgo(0.1) },
    timePlayed: timePlayed(tz),
    needsYou: { total: 3, failedSyncs: 0, unmatchedSessions: 2, unreadNotifications: 1 },
    syncedSources: 4,
    monthSpend: { amount: 15.99, currency: DEMO_CURRENCY },
  };
}

const PLAY_NEXT: { appId: number; score: number; reasons: string[] }[] = [
  { appId: 1091500, score: 92, reasons: ["Bought recently, still unplayed", "Fits your RPG hours"] },
  { appId: 367520, score: 78, reasons: ["You stopped close to the end", "Verified on Steam Deck"] },
  { appId: 105600, score: 71, reasons: ["Not played in six months", "One of your most played"] },
  { appId: 620, score: 63, reasons: ["Short session pick", "Co-op with friends"] },
];

function playNext(query: Record<string, unknown>): PlayNextItem[] {
  const limit = Number(query.limit);
  const size =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, PLAY_NEXT_MAX) : PLAY_NEXT_DEFAULT;
  return PLAY_NEXT.slice(0, size).flatMap((pick) => {
    const game = DEMO_GAMES.find((item) => item.appId === pick.appId);
    if (!game) return [];
    const lastPlayedDays = ownedProfile(game.appId).lastPlayedDays;
    return [
      {
        appId: game.appId,
        name: game.name,
        headerImage: steamHeaderUrl(game.appId),
        playtimeForever: game.minutes,
        lastPlayedAt: lastPlayedDays == null ? null : daysAgo(lastPlayedDays),
        score: pick.score,
        reasons: pick.reasons,
        deckStatus: metaFor(game.appId).deckStatus,
        genres: [...game.genres],
      },
    ];
  });
}

function buildGoal(
  id: string,
  fields: Pick<Goal, "domain" | "kind" | "name" | "targetRef" | "targetValue" | "progressValue" | "estimatedMinutes" | "timeframe">,
  periodDays: number,
  doneDays: number | null,
): Goal {
  return {
    id,
    ...fields,
    periodStart: daysAgo(3),
    periodEnd: daysAhead(periodDays),
    acceptedAt: daysAgo(3),
    doneAt: doneDays == null ? null : daysAgo(doneDays),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(doneDays ?? 1),
  };
}

function allGoals(): Goal[] {
  return [
    buildGoal("demo-goal-1", { domain: "games", kind: "game", name: "Start Cyberpunk 2077", targetRef: demoGameKey("Cyberpunk 2077"), targetValue: 1, progressValue: 0, estimatedMinutes: 120, timeframe: "week" }, 4, null),
    buildGoal("demo-goal-2", { domain: "games", kind: "game", name: "Finish Hollow Knight", targetRef: demoGameKey("Hollow Knight"), targetValue: 1, progressValue: 0, estimatedMinutes: 600, timeframe: "month" }, 24, null),
    buildGoal("demo-goal-3", { domain: "games", kind: "play", name: "Play 10 hours this week", targetRef: null, targetValue: 10, progressValue: 6, estimatedMinutes: 600, timeframe: "week" }, 4, null),
    buildGoal("demo-goal-4", { domain: "games", kind: "game", name: "Finish Celeste", targetRef: demoGameKey("Celeste"), targetValue: 1, progressValue: 1, estimatedMinutes: 300, timeframe: "month" }, 24, 2),
  ];
}

function goals(query: Record<string, unknown>): GoalListResponse {
  const domain = textParam(query.domain);
  const status = textParam(query.status) || "active";
  const timeframe = textParam(query.timeframe);
  const limit = Number(query.limit);
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, GOAL_LIMIT_MAX) : GOAL_LIMIT_MAX;
  const items = allGoals()
    .filter((goal) => !domain || goal.domain === domain)
    .filter((goal) => !timeframe || goal.timeframe === timeframe)
    .filter((goal) => {
      if (status === "all") return true;
      return status === "done" ? goal.doneAt != null : goal.doneAt == null;
    });
  return { items: items.slice(0, size) };
}

export const dashboardRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/dashboard/stats", respond: ({ query }) => dashboardStats(query.tz) },
  { method: "GET", pattern: "/dashboard/play-next", respond: ({ query }) => playNext(query) },
  { method: "GET", pattern: "/goals", respond: ({ query }) => goals(query) },
];
