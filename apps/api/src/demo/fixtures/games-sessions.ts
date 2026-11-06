import type {
  PlaySessionGameSuggestPage,
  PlaySessionItem,
  PlaySessionPage,
  PlaySessionSimilar,
  PlaySessionStats,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import { LIBRARY_GAMES, gameId, paginate, textParam } from "./games-catalog";
import { DEMO_GAMES, steamHeaderUrl } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_PAGE_SIZE = 15;
const SESSION_COUNT = 42;
const SESSION_STEP_DAYS = 2;
const MAX_SESSION_MS = 3 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const STATS_WINDOWS = [14, 30, 90];
const DEFAULT_WINDOW = 30;
const TOP_GAME_LIMIT = 5;
const UNMATCHED_EVERY = 19;
const DURATIONS_MIN = [48, 95, 62, 140, 35, 78, 118, 55];
const START_HOURS = [20, 21, 19, 22, 18, 23, 20, 13];

const PLAYED = LIBRARY_GAMES.filter((game) => game.minutes > 0);

type GeneratedSession = PlaySessionItem & { dayKey: string; hour: number };

function exeName(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.exe`;
}

function startedAt(index: number, now: number): Date {
  const day = new Date(now - (index * SESSION_STEP_DAYS + (index % 2)) * DAY_MS);
  day.setUTCHours(START_HOURS[index % START_HOURS.length], (index * 7) % 60, 0, 0);
  return day.getTime() > now - MAX_SESSION_MS ? new Date(day.getTime() - DAY_MS) : day;
}

export function generateSessions(now = Date.now()): GeneratedSession[] {
  return Array.from({ length: SESSION_COUNT }, (_, index) => {
    const unmatched = index % UNMATCHED_EVERY === UNMATCHED_EVERY - 1;
    const game = PLAYED[index % PLAYED.length];
    const start = startedAt(index, now);
    const durationSecs = DURATIONS_MIN[index % DURATIONS_MIN.length] * 60;
    const title = unmatched ? "Unknown launcher" : game.name;
    return {
      id: `demo-session-${index + 1}`,
      title,
      source: "qmonitor",
      appId: unmatched ? null : game.appId,
      gameId: unmatched ? null : gameId(game.appId),
      startedAt: start.toISOString(),
      endedAt: new Date(start.getTime() + durationSecs * 1000).toISOString(),
      durationSecs,
      exe: exeName(title),
      hostOs: "windows",
      hostName: "Living Room PC",
      game: unmatched
        ? null
        : {
            id: gameId(game.appId),
            name: game.name,
            headerImage: steamHeaderUrl(game.appId),
            appId: game.appId,
          },
      dayKey: start.toISOString().slice(0, 10),
      hour: start.getUTCHours(),
    };
  });
}

function toItem({ dayKey: _dayKey, hour: _hour, ...item }: GeneratedSession): PlaySessionItem {
  return item;
}

function sessionsPage(query: Record<string, unknown>): PlaySessionPage {
  const wanted = textParam(query.gameId);
  const sessions = generateSessions().map(toItem);
  const filtered = wanted ? sessions.filter((item) => item.gameId === wanted) : sessions;
  return paginate(filtered, query, SESSION_PAGE_SIZE);
}

function sumDuration(sessions: readonly GeneratedSession[]): number {
  return sessions.reduce((sum, session) => sum + session.durationSecs, 0);
}

function average(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0;
}

function windowDays(query: Record<string, unknown>): number {
  const days = Number(query.days);
  return STATS_WINDOWS.includes(days) ? days : DEFAULT_WINDOW;
}

function dayKeysEndingToday(days: number, now: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    new Date(now - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
  );
}

function topGames(sessions: readonly GeneratedSession[]) {
  const byGame = new Map<string, GeneratedSession[]>();
  for (const session of sessions) {
    const key = session.gameId ?? session.title;
    byGame.set(key, [...(byGame.get(key) ?? []), session]);
  }
  return [...byGame.entries()]
    .map(([key, rows]) => ({
      key,
      gameId: rows[0].gameId,
      name: rows[0].game?.name ?? rows[0].title,
      headerImage: rows[0].game?.headerImage ?? null,
      appId: rows[0].appId,
      durationSecs: sumDuration(rows),
      sessionCount: rows.length,
    }))
    .sort((a, b) => b.durationSecs - a.durationSecs)
    .slice(0, TOP_GAME_LIMIT);
}

function sessionStats(query: Record<string, unknown>): PlaySessionStats {
  const now = Date.now();
  const days = windowDays(query);
  const sessions = generateSessions(now);
  const keys = dayKeysEndingToday(days, now);
  const inWindow = sessions.filter((session) => keys.includes(session.dayKey));
  const weekKeys = keys.slice(-WEEK_DAYS);
  const inWeek = sessions.filter((session) => weekKeys.includes(session.dayKey));
  const total = sumDuration(sessions);
  const windowTotal = sumDuration(inWindow);
  const byHour = Array.from({ length: 24 }, (_, hour) =>
    sumDuration(inWindow.filter((session) => session.hour === hour)),
  );
  return {
    sessionCount: sessions.length,
    totalDurationSecs: total,
    avgDurationSecs: average(total, sessions.length),
    weekDurationSecs: sumDuration(inWeek),
    weekSessionCount: inWeek.length,
    unmatchedCount: sessions.filter((session) => session.gameId === null).length,
    uniqueGames: new Set(sessions.map((session) => session.gameId).filter(Boolean)).size,
    lastPlayedAt: sessions[0].endedAt,
    windowDays: days,
    weekDays: WEEK_DAYS,
    byDay: keys.map((day) => {
      const rows = inWindow.filter((session) => session.dayKey === day);
      return { day, durationSecs: sumDuration(rows), sessionCount: rows.length };
    }),
    topGames: topGames(inWindow),
    window: {
      sessionCount: inWindow.length,
      totalDurationSecs: windowTotal,
      avgDurationSecs: average(windowTotal, inWindow.length),
    },
    byHour,
  };
}

function similarSessions(id: string): PlaySessionSimilar {
  const sessions = generateSessions();
  const target = sessions.find((session) => session.id === id) ?? sessions[0];
  return {
    count: sessions.filter((session) => session.exe === target.exe && session.id !== target.id).length,
    matchKind: "exe",
    matchValue: target.exe ?? target.title,
  };
}

function gameSuggestions(query: Record<string, unknown>): PlaySessionGameSuggestPage {
  const needle = textParam(query.q).toLowerCase();
  return {
    items: DEMO_GAMES.filter((game) => game.name.toLowerCase().includes(needle)).map((game) => ({
      gameId: gameId(game.appId),
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      appId: game.appId,
    })),
  };
}

export const sessionRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/play-sessions", respond: ({ query }) => sessionsPage(query) },
  { method: "GET", pattern: "/play-sessions/stats", respond: ({ query }) => sessionStats(query) },
  {
    method: "GET",
    pattern: "/play-sessions/game-suggest",
    respond: ({ query }) => gameSuggestions(query),
  },
  {
    method: "GET",
    pattern: "/play-sessions/:id/similar",
    respond: ({ params }) => similarSessions(params.id),
  },
];
