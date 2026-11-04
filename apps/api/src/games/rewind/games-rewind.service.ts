import { Injectable } from "@nestjs/common";
import type { RewindGamesStats, RewindTopItem } from "@questorylabs/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { SteamApiService } from "../../steam/steam-api.service";
import { AccountsService } from "../../accounts/accounts.service";
import {
  compareToPrior,
  droppedOff,
  priorPeriodBounds,
  zonedPeriodBounds,
  type PeriodBounds,
} from "../../lib/rewind-stats";
import {
  ABANDONED_MAX_MINUTES,
  countNewGames,
  countUnlocksInPeriod,
  dayExtras,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  longestSession,
  mergeItemMinutes,
  minutesByItem,
  normalizeSessions,
  sessionMinuteEvents,
  sessionShape,
  snapshotMinuteEvents,
  topGames,
  topGenres,
  type GameInfo,
} from "./games-rewind-stats";

const MAX_SESSIONS = 20_000;
const MAX_SNAPSHOTS = 50_000;
const ACHIEVEMENT_GAMES = 5;
const PERFECT_GAME_CANDIDATES = 500;
const DROP_CANDIDATES = 20;
const ABANDON_QUIET_MS = 30 * 86_400_000;

type GameInfoRow = GameInfo & { id: string; appId: number | null };

@Injectable()
export class GamesRewindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly accounts: AccountsService,
  ) {}

  async rewindStats(
    userId: string,
    period: string,
    timeZone = "UTC",
  ): Promise<RewindGamesStats> {
    const bounds = zonedPeriodBounds(period, timeZone);
    const prior = priorPeriodBounds(period, timeZone);
    const hidden = new Set(
      (
        await this.prisma.libraryEntry.findMany({
          where: { userId, hidden: true },
          select: { gameId: true },
        })
      ).map((r) => r.gameId),
    );

    const [sessionRows, snapshotRows, baselineRows, earliestSession, earliestSnapshot] =
      await Promise.all([
        this.prisma.playSession.findMany({
          where: { userId, endedAt: { gte: bounds.start, lt: bounds.end } },
          select: {
            gameId: true,
            title: true,
            startedAt: true,
            durationSecs: true,
            game: { select: { name: true, headerImage: true, genres: true } },
          },
          orderBy: { endedAt: "asc" },
          take: MAX_SESSIONS,
        }),
        this.prisma.playActivitySnapshot.findMany({
          where: { userId, observedAt: { gte: bounds.start, lt: bounds.end } },
          select: { gameId: true, observedAt: true, playtimeForever: true },
          orderBy: { observedAt: "asc" },
          take: MAX_SNAPSHOTS,
        }),
        this.prisma.playActivitySnapshot.groupBy({
          by: ["gameId"],
          where: { userId, observedAt: { lt: bounds.start } },
          _max: { playtimeForever: true },
        }),
        this.prisma.playSession.aggregate({
          where: { userId },
          _min: { startedAt: true },
        }),
        this.prisma.playActivitySnapshot.aggregate({
          where: { userId },
          _min: { observedAt: true },
        }),
      ]);

    const visibleSessions = sessionRows.filter((r) => !r.gameId || !hidden.has(r.gameId));
    const visibleSnapshots = snapshotRows.filter((r) => !hidden.has(r.gameId));
    const baseline = new Map(
      baselineRows.map((r) => [r.gameId, r._max.playtimeForever ?? 0] as const),
    );

    const info = await this.gameInfo([
      ...new Set([
        ...visibleSnapshots.map((r) => r.gameId),
        ...visibleSessions.flatMap((r) => (r.gameId ? [r.gameId] : [])),
      ]),
    ]);
    const names = new Map([...info].map(([id, g]) => [id, g.name] as const));

    const sessions = normalizeSessions(visibleSessions);
    const sessionEvents = sessionMinuteEvents(sessions, timeZone);
    const snapshotEvents = snapshotMinuteEvents(visibleSnapshots, baseline, names, timeZone);
    const sessionMinutes = minutesByItem(sessionEvents);
    const snapshotMinutes = minutesByItem(snapshotEvents);
    const minutes = mergeItemMinutes(sessionMinutes, snapshotMinutes);
    const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    const totalMinutes = sum(minutes);
    const dayEvents =
      sum(sessionMinutes) >= sum(snapshotMinutes) ? sessionEvents : snapshotEvents;

    for (const s of sessions) if (!names.has(s.key)) names.set(s.key, s.name);

    const earliest = [earliestSession._min.startedAt, earliestSnapshot._min.observedAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const coverage = earliest != null && earliest <= prior.start;

    const [priorItems, newGames, backlog, abandoned, achievementsInPeriod, perfectGames] =
      await Promise.all([
        this.priorMinutes(userId, prior, hidden),
        this.newGames(userId, bounds, minutes, baseline),
        this.backlog(userId),
        period.length === 4 ? this.abandoned(userId, bounds) : Promise.resolve(undefined),
        this.achievements(userId, bounds, minutes, info),
        this.perfectGames(userId, minutes, info),
      ]);

    const currentIds = new Set(minutes.keys());
    const priorTotal = priorItems.reduce((a, r) => a + r.count, 0);
    const dropped = coverage
      ? await this.namedDrops(droppedOff(priorItems, currentIds))
      : [];
    const shape = sessionShape(sessions, timeZone);

    return {
      domain: "games",
      period,
      totalMinutes,
      sessions: sessions.length,
      sessionsAvailable: sessions.length > 0,
      uniqueGames: [...minutes.values()].filter((m) => m > 0).length,
      newGames,
      topGames: topGames(minutes, info, names),
      topGenres: topGenres(minutes, info),
      longestSession: longestSession(sessions, timeZone),
      lateNightShare: shape.lateNightShare,
      peakHour: shape.peakHour,
      peakDow: shape.peakDow,
      backlog,
      ...(abandoned ? { abandoned } : {}),
      achievementsInPeriod,
      perfectGames,
      ...dayExtras(dayEvents, period),
      prior: compareToPrior({
        total: totalMinutes,
        priorTotal,
        currentItemIds: currentIds,
        priorItemIds: new Set(priorItems.map((r) => r.id)),
        coverage,
      }),
      droppedOff: dropped,
    };
  }

  private async gameInfo(ids: string[]): Promise<Map<string, GameInfoRow>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.game.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, headerImage: true, genres: true, appId: true },
    });
    return new Map(rows.map((r) => [r.id, r]));
  }

  private async priorMinutes(
    userId: string,
    prior: PeriodBounds,
    hidden: Set<string>,
  ): Promise<{ id: string; name: string; count: number }[]> {
    const minSecs = MIN_SESSION_MINUTES * 60 - 30;
    const capSecs = MAX_SESSION_MINUTES * 60 + 30;
    const [sessions, capped, inPeriod, before] = await Promise.all([
      this.prisma.playSession.groupBy({
        by: ["gameId"],
        where: {
          userId,
          endedAt: { gte: prior.start, lt: prior.end },
          durationSecs: { gte: minSecs, lt: capSecs },
        },
        _sum: { durationSecs: true },
      }),
      this.prisma.playSession.groupBy({
        by: ["gameId"],
        where: {
          userId,
          endedAt: { gte: prior.start, lt: prior.end },
          durationSecs: { gte: capSecs },
        },
        _count: { _all: true },
      }),
      this.prisma.playActivitySnapshot.groupBy({
        by: ["gameId"],
        where: { userId, observedAt: { gte: prior.start, lt: prior.end } },
        _max: { playtimeForever: true },
        _min: { playtimeForever: true },
      }),
      this.prisma.playActivitySnapshot.groupBy({
        by: ["gameId"],
        where: { userId, observedAt: { lt: prior.start } },
        _max: { playtimeForever: true },
      }),
    ]);
    const baseline = new Map(before.map((r) => [r.gameId, r._max.playtimeForever ?? 0]));
    const out = new Map<string, number>();
    for (const r of sessions) {
      if (!r.gameId || hidden.has(r.gameId)) continue;
      out.set(r.gameId, Math.round((r._sum.durationSecs ?? 0) / 60));
    }
    for (const r of capped) {
      if (!r.gameId || hidden.has(r.gameId)) continue;
      out.set(r.gameId, (out.get(r.gameId) ?? 0) + r._count._all * MAX_SESSION_MINUTES);
    }
    for (const r of inPeriod) {
      if (hidden.has(r.gameId)) continue;
      const base = baseline.get(r.gameId) ?? r._min.playtimeForever ?? 0;
      const delta = Math.max(0, (r._max.playtimeForever ?? 0) - base);
      if (delta > (out.get(r.gameId) ?? 0)) out.set(r.gameId, delta);
    }
    return [...out.entries()]
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ id, name: "", count }));
  }

  private async namedDrops(
    items: { id: string; name: string; count: number }[],
  ): Promise<RewindTopItem[]> {
    const top = items.slice(0, DROP_CANDIDATES);
    if (!top.length) return [];
    const info = await this.gameInfo(top.map((r) => r.id));
    return top
      .filter((r) => info.has(r.id))
      .map((r) => ({
        id: r.id,
        name: info.get(r.id)!.name,
        count: r.count,
        imageUrl: info.get(r.id)!.headerImage,
      }));
  }

  private async newGames(
    userId: string,
    bounds: PeriodBounds,
    minutes: Map<string, number>,
    baseline: Map<string, number>,
  ): Promise<number> {
    const ids = [...minutes.keys()].filter((id) => !id.startsWith("title:"));
    if (!ids.length) return 0;
    const [earlier, entries] = await Promise.all([
      this.prisma.playSession.groupBy({
        by: ["gameId"],
        where: { userId, gameId: { in: ids }, endedAt: { lt: bounds.start } },
        _count: { _all: true },
      }),
      this.prisma.libraryEntry.findMany({
        where: { userId, gameId: { in: ids } },
        select: { gameId: true, playtimeForever: true },
      }),
    ]);
    const playedBefore = new Set<string>();
    for (const r of earlier) if (r.gameId) playedBefore.add(r.gameId);
    for (const [id, base] of baseline) if (base > 0) playedBefore.add(id);
    const known = new Map(
      [...minutes].filter(([id]) => !id.startsWith("title:")),
    );
    return countNewGames({
      minutes: known,
      playedBefore,
      lifetime: new Map(entries.map((e) => [e.gameId, e.playtimeForever])),
    });
  }

  private async backlog(userId: string): Promise<number | null> {
    const owned = await this.prisma.libraryEntry.count({
      where: { userId, hidden: false, ownerships: { some: { store: "steam" } } },
    });
    if (owned === 0) return null;
    return this.prisma.libraryEntry.count({
      where: {
        userId,
        hidden: false,
        playtimeForever: 0,
        ownerships: { some: { store: "steam" } },
      },
    });
  }

  private async abandoned(
    userId: string,
    bounds: PeriodBounds,
  ): Promise<RewindTopItem[]> {
    const quietBefore = new Date(
      Math.min(bounds.end.getTime(), Date.now()) - ABANDON_QUIET_MS,
    );
    if (quietBefore <= bounds.start) return [];
    const rows = await this.prisma.libraryEntry.findMany({
      where: {
        userId,
        hidden: false,
        playtimeForever: { gt: 0, lt: ABANDONED_MAX_MINUTES },
        lastPlayedAt: { gte: bounds.start, lte: quietBefore },
        game: { isFree: false },
      },
      select: {
        gameId: true,
        playtimeForever: true,
        game: { select: { name: true, headerImage: true } },
      },
      orderBy: { playtimeForever: "desc" },
      take: 5,
    });
    return rows.map((r) => ({
      id: r.gameId,
      name: r.game.name,
      count: r.playtimeForever,
      imageUrl: r.game.headerImage,
    }));
  }

  private async perfectGames(
    userId: string,
    minutes: Map<string, number>,
    info: Map<string, GameInfoRow>,
  ): Promise<number> {
    const gameIds = [...minutes.entries()]
      .filter(([id, m]) => m > 0 && info.has(id))
      .map(([id]) => id)
      .slice(0, PERFECT_GAME_CANDIDATES);
    if (!gameIds.length) return 0;
    return this.prisma.libraryEntry.count({
      where: { userId, gameId: { in: gameIds }, achievementPct: { gte: 100 } },
    });
  }

  private async achievements(
    userId: string,
    bounds: PeriodBounds,
    minutes: Map<string, number>,
    info: Map<string, GameInfoRow>,
  ): Promise<number | null> {
    const appIds = [...minutes.entries()]
      .sort((a, b) => b[1] - a[1])
      .flatMap(([id]) => {
        const appId = info.get(id)?.appId;
        return appId ? [appId] : [];
      })
      .slice(0, ACHIEVEMENT_GAMES);
    if (!appIds.length) return null;
    const steamId = await this.accounts.getSteamId(userId);
    if (!steamId) return null;
    let total = 0;
    let any = false;
    for (const appId of appIds) {
      const stats = await this.steam.getPlayerAchievements(steamId, appId);
      if (!stats) continue;
      any = true;
      total += countUnlocksInPeriod(stats.unlockTimes, bounds.start, bounds.end);
    }
    return any ? total : null;
  }
}
