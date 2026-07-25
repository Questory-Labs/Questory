import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

export type RangeKey = "day" | "week" | "month" | "year" | "all";

function rangeStart(range: RangeKey): Date | null {
  const now = Date.now();
  switch (range) {
    case "day":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async resolveUser(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("Watch user not found");
    return user;
  }

  async overview(userId?: string) {
    const user = await this.resolveUser(userId);
    const [totalWatches, distinctTitles, latest, earliest, minutesAgg] =
      await Promise.all([
        this.prisma.watchEvent.count({ where: { userId: user.id } }),
        this.prisma.watchEvent
          .findMany({
            where: { userId: user.id },
            select: { titleId: true },
            distinct: ["titleId"],
          })
          .then((r) => r.length),
        this.prisma.watchEvent.findFirst({
          where: { userId: user.id },
          orderBy: { watchedAt: "desc" },
        }),
        this.prisma.watchEvent.findFirst({
          where: { userId: user.id },
          orderBy: { watchedAt: "asc" },
        }),
        this.prisma.watchHourBucket.aggregate({
          where: { userId: user.id },
          _sum: { minutesWatched: true },
        }),
      ]);

    return {
      userId: user.id,
      personaName: user.personaName,
      totalWatches,
      uniqueTitles: distinctTitles,
      totalMinutes: minutesAgg._sum.minutesWatched ?? 0,
      latestWatchAt: latest?.watchedAt?.toISOString() ?? null,
      earliestWatchAt: earliest?.watchedAt?.toISOString() ?? null,
      streakDays: await this.computeStreak(user.id),
    };
  }

  async tops(
    kind: "titles" | "genres" | "movies" | "shows",
    range: RangeKey,
    limit = 20,
    userId?: string,
  ) {
    const user = await this.resolveUser(userId);
    const start = rangeStart(range);
    const events = await this.prisma.watchEvent.findMany({
      where: {
        userId: user.id,
        ...(start ? { watchedAt: { gte: start } } : {}),
        ...(kind === "movies" ? { title: { type: "movie" } } : {}),
        ...(kind === "shows" ? { title: { type: "show" } } : {}),
      },
      include: {
        title: {
          include: { genres: { include: { genre: true } } },
        },
      },
    });

    if (kind === "genres") {
      const counts = new Map<string, { id: string; name: string; count: number }>();
      for (const e of events) {
        for (const tg of e.title.genres) {
          const cur = counts.get(tg.genreId) || {
            id: tg.genreId,
            name: tg.genre.name,
            count: 0,
          };
          cur.count += 1;
          counts.set(tg.genreId, cur);
        }
      }
      return [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }

    const counts = new Map<
      string,
      { id: string; name: string; type: string; posterUrl: string | null; count: number }
    >();
    for (const e of events) {
      const cur = counts.get(e.titleId) || {
        id: e.titleId,
        name: e.title.name,
        type: e.title.type,
        posterUrl: e.title.posterUrl,
        count: 0,
      };
      cur.count += 1;
      counts.set(e.titleId, cur);
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async timeSeries(
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week",
    range: RangeKey,
    userId?: string,
  ) {
    const user = await this.resolveUser(userId);
    const start = rangeStart(range);

    if (granularity === "hourOfDay" || granularity === "dayOfWeek") {
      const events = await this.prisma.watchEvent.findMany({
        where: {
          userId: user.id,
          ...(start ? { watchedAt: { gte: start } } : {}),
        },
        select: { watchedAt: true },
      });
      if (granularity === "hourOfDay") {
        const buckets = Array.from({ length: 24 }, (_, i) => ({
          key: String(i),
          label: `${String(i).padStart(2, "0")}:00`,
          count: 0,
        }));
        for (const e of events) buckets[e.watchedAt.getUTCHours()].count += 1;
        return buckets;
      }
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets = labels.map((label, i) => ({
        key: String(i),
        label,
        count: 0,
      }));
      for (const e of events) buckets[e.watchedAt.getUTCDay()].count += 1;
      return buckets;
    }

    const buckets = await this.prisma.watchHourBucket.findMany({
      where: {
        userId: user.id,
        ...(start ? { hourStart: { gte: start } } : {}),
      },
      orderBy: { hourStart: "asc" },
    });

    const map = new Map<string, number>();
    for (const b of buckets) {
      const d = b.hourStart;
      let key: string;
      if (granularity === "day") {
        key = d.toISOString().slice(0, 10);
      } else {
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(
          ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        );
        key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      }
      map.set(key, (map.get(key) || 0) + b.watchCount);
    }
    return [...map.entries()].map(([key, count]) => ({
      key,
      label: key,
      count,
    }));
  }

  async recent(limit = 40, userId?: string) {
    const user = await this.resolveUser(userId);
    const rows = await this.prisma.watchEvent.findMany({
      where: { userId: user.id },
      orderBy: { watchedAt: "desc" },
      take: Math.min(limit, 100),
      include: {
        title: { include: { genres: { include: { genre: true } } } },
        episode: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      watchedAt: r.watchedAt.toISOString(),
      source: r.source,
      precision: r.precision,
      title: {
        id: r.title.id,
        name: r.title.name,
        type: r.title.type,
        posterUrl: r.title.posterUrl,
        genres: r.title.genres.map((g) => g.genre.name),
      },
      episode: r.episode
        ? {
            id: r.episode.id,
            seasonNumber: r.episode.seasonNumber,
            episodeNumber: r.episode.episodeNumber,
            name: r.episode.name,
          }
        : null,
    }));
  }

  private async computeStreak(userId: string) {
    const recent = await this.prisma.watchEvent.findMany({
      where: { userId },
      select: { watchedAt: true },
      orderBy: { watchedAt: "desc" },
      take: 400,
    });
    const days = new Set(
      recent.map((r) => r.watchedAt.toISOString().slice(0, 10)),
    );
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }
}
