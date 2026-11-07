import { Injectable } from "@nestjs/common";
import type { BacklogNextUp, BacklogSummary } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";

export const BACKLOG_AVG_WEEKS = 8;
export const BACKLOG_NEXT_UP_LIMIT = 5;
const SNAPSHOT_LIMIT = 50_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const QUEUE_STATUSES = new Set(["backlog", "playing"]);

type BacklogEntry = {
  userStatus: string | null;
  playtimeForever: number;
  game: { hltbMainHours: number | null };
};

export function isUnplayedBacklog(e: {
  userStatus: string | null;
  playtimeForever: number;
}) {
  return (
    e.userStatus === "backlog" ||
    (e.userStatus == null && e.playtimeForever === 0)
  );
}

export const WISHLIST_BACKLOG_PENALTY_MAX = 20;

export function wishlistBacklogPenalty(
  entries: { userStatus: string | null; playtimeForever: number }[],
) {
  return Math.min(
    WISHLIST_BACKLOG_PENALTY_MAX,
    entries.filter(isUnplayedBacklog).length,
  );
}

export function backlogHint(entries: BacklogEntry[]) {
  let count = 0;
  let hours = 0;
  for (const e of entries) {
    if (!isUnplayedBacklog(e)) continue;
    count += 1;
    hours += e.game.hltbMainHours ?? 0;
  }
  return { count, hours: Math.round(hours) };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class BacklogService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    userId: string,
    timeZone: string,
    now = new Date(),
  ): Promise<BacklogSummary> {
    const entries = await this.prisma.libraryEntry.findMany({
      where: { userId, hidden: false },
      select: {
        gameId: true,
        playtimeForever: true,
        playtime2Weeks: true,
        userStatus: true,
        game: {
          select: {
            id: true,
            appId: true,
            name: true,
            headerImage: true,
            hltbMainHours: true,
            hltbExtraHours: true,
            reviewScore: true,
          },
        },
      },
    });

    const counts = {
      playing: 0,
      backlog: 0,
      shelved: 0,
      finished: 0,
      dropped: 0,
      unset: 0,
    };
    const backlogHours = { main: 0, extra: 0, unknownCount: 0 };
    let remainingHours = 0;
    const candidates: BacklogNextUp[] = [];

    for (const e of entries) {
      const status = e.userStatus;
      if (status && status in counts && status !== "unset") {
        counts[status as keyof typeof counts] += 1;
      } else {
        counts.unset += 1;
      }
      if (!status || !QUEUE_STATUSES.has(status)) continue;
      const main = e.game.hltbMainHours;
      if (main == null) {
        backlogHours.unknownCount += 1;
      } else {
        backlogHours.main += main;
        backlogHours.extra += e.game.hltbExtraHours ?? main;
        remainingHours += Math.max(0, main - e.playtimeForever / 60);
      }
      if (status === "backlog") {
        candidates.push({
          gameId: e.game.id,
          appId: e.game.appId ?? null,
          name: e.game.name,
          headerImage: e.game.headerImage ?? null,
          hltbMainHours: main,
          reviewScore: e.game.reviewScore ?? null,
          playtimeHours: round1(e.playtimeForever / 60),
        });
      }
    }

    candidates.sort((a, b) => {
      if (a.hltbMainHours == null && b.hltbMainHours != null) return 1;
      if (a.hltbMainHours != null && b.hltbMainHours == null) return -1;
      if (
        a.hltbMainHours != null &&
        b.hltbMainHours != null &&
        a.hltbMainHours !== b.hltbMainHours
      ) {
        return a.hltbMainHours - b.hltbMainHours;
      }
      return (b.reviewScore ?? -1) - (a.reviewScore ?? -1);
    });

    const snapshotAvg = await this.weeklyAverageFromSnapshots(userId, now);
    let avgWeeklyHours = snapshotAvg;
    let avgSource: BacklogSummary["avgSource"] = "snapshots";
    if (avgWeeklyHours <= 0) {
      const twoWeeks = entries.reduce(
        (sum, e) => sum + (e.playtime2Weeks ?? 0),
        0,
      );
      avgWeeklyHours = twoWeeks / 2 / 60;
      avgSource = avgWeeklyHours > 0 ? "steam2weeks" : "none";
    }
    avgWeeklyHours = round1(avgWeeklyHours);

    return {
      counts,
      backlogHours: {
        main: round1(backlogHours.main),
        extra: round1(backlogHours.extra),
        unknownCount: backlogHours.unknownCount,
      },
      remainingHours: round1(remainingHours),
      avgWeeklyHours,
      avgSource,
      weeksToClear:
        avgWeeklyHours > 0 ? round1(remainingHours / avgWeeklyHours) : null,
      nextUp: candidates.slice(0, BACKLOG_NEXT_UP_LIMIT),
    };
  }

  private async weeklyAverageFromSnapshots(userId: string, now: Date) {
    const since = new Date(now.getTime() - BACKLOG_AVG_WEEKS * WEEK_MS);
    const rows = await this.prisma.playActivitySnapshot.findMany({
      where: { userId, observedAt: { gte: since } },
      select: { gameId: true, observedAt: true, playtimeForever: true },
      orderBy: { observedAt: "asc" },
      take: SNAPSHOT_LIMIT,
    });
    const last = new Map<string, number>();
    let minutes = 0;
    for (const r of rows) {
      const prev = last.get(r.gameId);
      if (prev != null && r.playtimeForever > prev) {
        minutes += r.playtimeForever - prev;
      }
      last.set(r.gameId, r.playtimeForever);
    }
    if (minutes <= 0 || !rows[0]) return 0;
    const elapsedWeeks = Math.ceil(
      (now.getTime() - rows[0].observedAt.getTime()) / WEEK_MS,
    );
    return minutes / 60 / Math.min(BACKLOG_AVG_WEEKS, Math.max(1, elapsedWeeks));
  }
}
