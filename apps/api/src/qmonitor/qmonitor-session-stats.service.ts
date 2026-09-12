import { Injectable } from "@nestjs/common";
import type { PlaySessionStats } from "@questorylabs/shared";
import { zonedDayKey, zonedDayKeysEndingToday } from "../lib/timezone";
import { PrismaService } from "../prisma/prisma.service";
import {
  PLAY_SESSION_STATS_DAYS,
  PLAY_SESSION_STATS_TOP_GAMES,
  PLAY_SESSION_STATS_WEEK_DAYS,
  PLAY_SESSION_STATS_WINDOW_CAP,
  PLAY_SESSION_STATS_WINDOW_PAD_DAYS,
} from "./qmonitor.constants";

type WindowRow = {
  endedAt: Date;
  durationSecs: number;
  gameId: string | null;
  title: string;
  game: {
    id: string;
    name: string;
    headerImage: string | null;
    appId: number | null;
  } | null;
};

@Injectable()
export class QmonitorSessionStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(
    userId: string,
    timeZone: string,
    now = new Date(),
  ): Promise<PlaySessionStats> {
    const dayKeys = zonedDayKeysEndingToday(
      timeZone,
      PLAY_SESSION_STATS_DAYS,
      now,
    );
    const since = new Date(
      now.getTime() -
        (PLAY_SESSION_STATS_DAYS + PLAY_SESSION_STATS_WINDOW_PAD_DAYS) *
          24 *
          60 *
          60 *
          1000,
    );

    const [totals, unmatchedCount, uniqueGroups, last, windowRows] =
      await Promise.all([
        this.prisma.playSession.aggregate({
          where: { userId },
          _count: { _all: true },
          _sum: { durationSecs: true },
          _avg: { durationSecs: true },
        }),
        this.prisma.playSession.count({
          where: { userId, gameId: null },
        }),
        this.prisma.playSession.groupBy({
          by: ["gameId"],
          where: { userId, gameId: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.playSession.findFirst({
          where: { userId },
          orderBy: { endedAt: "desc" },
          select: { endedAt: true },
        }),
        this.prisma.playSession.findMany({
          where: { userId, endedAt: { gte: since } },
          orderBy: { endedAt: "desc" },
          take: PLAY_SESSION_STATS_WINDOW_CAP,
          select: {
            endedAt: true,
            durationSecs: true,
            gameId: true,
            title: true,
            game: {
              select: {
                id: true,
                name: true,
                headerImage: true,
                appId: true,
              },
            },
          },
        }),
      ]);

    const byDayMap = new Map(
      dayKeys.map((day) => [day, { durationSecs: 0, sessionCount: 0 }]),
    );
    const dayKeySet = new Set(dayKeys);
    for (const row of windowRows as WindowRow[]) {
      const day = zonedDayKey(row.endedAt, timeZone);
      const bucket = byDayMap.get(day);
      if (!bucket) continue;
      bucket.durationSecs += row.durationSecs;
      bucket.sessionCount += 1;
    }

    const byDay = dayKeys.map((day) => ({
      day,
      durationSecs: byDayMap.get(day)?.durationSecs ?? 0,
      sessionCount: byDayMap.get(day)?.sessionCount ?? 0,
    }));
    const weekSlice = byDay.slice(-PLAY_SESSION_STATS_WEEK_DAYS);

    return {
      sessionCount: totals._count._all,
      totalDurationSecs: totals._sum.durationSecs ?? 0,
      avgDurationSecs: Math.round(totals._avg.durationSecs ?? 0),
      weekDurationSecs: weekSlice.reduce((sum, d) => sum + d.durationSecs, 0),
      weekSessionCount: weekSlice.reduce((sum, d) => sum + d.sessionCount, 0),
      unmatchedCount,
      uniqueGames: uniqueGroups.length,
      lastPlayedAt: last?.endedAt.toISOString() ?? null,
      windowDays: PLAY_SESSION_STATS_DAYS,
      weekDays: PLAY_SESSION_STATS_WEEK_DAYS,
      byDay,
      topGames: topGamesInWindow(windowRows as WindowRow[], dayKeySet, timeZone),
    };
  }
}

function topGamesInWindow(
  rows: WindowRow[],
  dayKeys: Set<string>,
  timeZone: string,
) {
  const byKey = new Map<
    string,
    {
      gameId: string | null;
      name: string;
      headerImage: string | null;
      appId: number | null;
      durationSecs: number;
      sessionCount: number;
    }
  >();

  for (const row of rows) {
    if (!dayKeys.has(zonedDayKey(row.endedAt, timeZone))) continue;
    const gameId = row.gameId;
    const key = gameId ?? `title:${row.title}`;
    const current = byKey.get(key);
    if (current) {
      current.durationSecs += row.durationSecs;
      current.sessionCount += 1;
      continue;
    }
    byKey.set(key, {
      gameId,
      name: row.game?.name ?? row.title,
      headerImage: row.game?.headerImage ?? null,
      appId: row.game?.appId ?? null,
      durationSecs: row.durationSecs,
      sessionCount: 1,
    });
  }

  return [...byKey.entries()]
    .sort((a, b) => b[1].durationSecs - a[1].durationSecs)
    .slice(0, PLAY_SESSION_STATS_TOP_GAMES)
    .map(([key, game]) => ({ key, ...game }));
}
