import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

export type RangeKey = "day" | "week" | "month" | "year" | "all";
export type MediaType = "movie" | "show";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/** Length of the active window in ms (for previous-period compare). */
function rangeDurationMs(range: RangeKey): number | null {
  switch (range) {
    case "day":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 30 * 24 * 60 * 60 * 1000;
    case "year":
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 || 12;
  const suffix = hour < 12 ? "am" : "pm";
  return `${h12}${suffix}`;
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

  private eventWhere(userId: string, range: RangeKey, type?: MediaType) {
    const since = rangeStart(range);
    return {
      userId,
      ...(since ? { watchedAt: { gte: since } } : {}),
      ...(type ? { title: { type } } : {}),
    };
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
    type?: MediaType,
  ) {
    const user = await this.resolveUser(userId);
    const start = rangeStart(range);
    const eventWhere = this.eventWhere(user.id, range, type);

    if (
      granularity === "hourOfDay" ||
      granularity === "dayOfWeek" ||
      type
    ) {
      const events = await this.prisma.watchEvent.findMany({
        where: eventWhere,
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
      if (granularity === "dayOfWeek") {
        const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const buckets = labels.map((label, i) => ({
          key: String(i),
          label,
          count: 0,
        }));
        for (const e of events) buckets[e.watchedAt.getUTCDay()].count += 1;
        return buckets;
      }

      const map = new Map<string, number>();
      for (const e of events) {
        const d = e.watchedAt;
        let key: string;
        if (granularity === "day") {
          key = d.toISOString().slice(0, 10);
        } else {
          const tmp = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          );
          const dayNum = tmp.getUTCDay() || 7;
          tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil(
            ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
          );
          key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
        }
        map.set(key, (map.get(key) || 0) + 1);
      }
      return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({ key, label: key, count }));
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

  async insights(
    userId: string,
    range: RangeKey = "week",
    type?: MediaType,
  ) {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);
    const eventWhere = this.eventWhere(user.id, range, type);

    const events = await this.prisma.watchEvent.findMany({
      where: eventWhere,
      select: {
        titleId: true,
        watchedAt: true,
        source: true,
        runtimeMinutes: true,
        title: {
          select: {
            type: true,
            runtimeMinutes: true,
            genres: {
              select: {
                genre: { select: { id: true, name: true } },
              },
            },
          },
        },
        episode: {
          select: { runtimeMinutes: true },
        },
      },
    });

    const periodWatches = events.length;
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    const dowBuckets = Array.from({ length: 7 }, () => 0);
    const titleCounts = new Map<string, number>();
    const movieTitleIds = new Set<string>();
    const showTitleIds = new Set<string>();
    const genreCounts = new Map<string, { name: string; count: number }>();
    const sourceCounts = new Map<string, number>();
    let watchingMinutes = 0;
    let watchesWithRuntime = 0;
    let movieWatches = 0;
    let showWatches = 0;
    let movieMinutes = 0;
    let showMinutes = 0;

    for (const e of events) {
      hourBuckets[e.watchedAt.getUTCHours()] += 1;
      dowBuckets[e.watchedAt.getUTCDay()] += 1;
      titleCounts.set(e.titleId, (titleCounts.get(e.titleId) || 0) + 1);

      const runtime =
        e.runtimeMinutes ??
        e.episode?.runtimeMinutes ??
        e.title.runtimeMinutes ??
        null;
      if (runtime != null && runtime > 0) {
        watchingMinutes += runtime;
        watchesWithRuntime += 1;
        if (e.title.type === "movie") movieMinutes += runtime;
        else if (e.title.type === "show") showMinutes += runtime;
      }

      const src = (e.source || "unknown").trim() || "unknown";
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);

      if (e.title.type === "movie") {
        movieWatches += 1;
        movieTitleIds.add(e.titleId);
      } else if (e.title.type === "show") {
        showWatches += 1;
        showTitleIds.add(e.titleId);
      }

      for (const tg of e.title.genres) {
        const g = tg.genre;
        const cur = genreCounts.get(g.id) || { name: g.name, count: 0 };
        cur.count += 1;
        genreCounts.set(g.id, cur);
      }
    }

    const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets, 0));
    const peakDowIdx = dowBuckets.indexOf(Math.max(...dowBuckets, 0));
    const peakHour =
      periodWatches > 0 && hourBuckets[peakHourIdx] > 0
        ? {
            hour: peakHourIdx,
            label: hourLabel(peakHourIdx),
            count: hourBuckets[peakHourIdx],
          }
        : null;
    const peakDow =
      periodWatches > 0 && dowBuckets[peakDowIdx] > 0
        ? {
            day: peakDowIdx,
            label: DOW_LABELS[peakDowIdx],
            count: dowBuckets[peakDowIdx],
          }
        : null;

    const topGenreEntry = [...genreCounts.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    const topTitleCount = Math.max(0, ...titleCounts.values());
    const topTitleShare =
      periodWatches > 0 ? topTitleCount / periodWatches : 0;

    const uniqueTitleIds = [...titleCounts.keys()];
    let newTitles = 0;
    if (since && uniqueTitleIds.length > 0) {
      const earliestTitles = await this.prisma.watchEvent.groupBy({
        by: ["titleId"],
        where: { userId: user.id, titleId: { in: uniqueTitleIds } },
        _min: { watchedAt: true },
      });
      newTitles = earliestTitles.filter(
        (row) => row._min.watchedAt && row._min.watchedAt >= since,
      ).length;
    } else if (!since) {
      newTitles = uniqueTitleIds.length;
    }

    const sourceBreakdown = [...sourceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const durationMs = rangeDurationMs(range);
    let previousWatches: number | null = null;
    let deltaPct: number | null = null;
    if (durationMs != null && since) {
      const prevStart = new Date(since.getTime() - durationMs);
      previousWatches = await this.prisma.watchEvent.count({
        where: {
          userId: user.id,
          watchedAt: { gte: prevStart, lt: since },
          ...(type ? { title: { type } } : {}),
        },
      });
      if (previousWatches > 0) {
        deltaPct =
          Math.round(
            ((periodWatches - previousWatches) / previousWatches) * 1000,
          ) / 10;
      } else if (periodWatches > 0) {
        deltaPct = 100;
      } else {
        deltaPct = 0;
      }
    }

    return {
      range,
      type: type ?? "all",
      periodWatches,
      peakHour,
      peakDow,
      topGenre: topGenreEntry
        ? {
            id: topGenreEntry[0],
            name: topGenreEntry[1].name,
            count: topGenreEntry[1].count,
          }
        : null,
      watchingMinutes,
      watchesWithRuntime,
      runtimeCoverage:
        periodWatches > 0
          ? Math.round((watchesWithRuntime / periodWatches) * 1000) / 10
          : 0,
      newTitles,
      topTitleShare: Math.round(topTitleShare * 1000) / 10,
      uniqueTitles: uniqueTitleIds.length,
      movieWatches,
      showWatches,
      movieMinutes,
      showMinutes,
      uniqueMovies: movieTitleIds.size,
      uniqueShows: showTitleIds.size,
      sourceBreakdown,
      compare: {
        previousWatches,
        deltaPct,
      },
    };
  }

  async breakdown(
    userId: string,
    kind: "years" | "sources",
    range: RangeKey,
    limit = 20,
    type?: MediaType,
  ) {
    const user = await this.resolveUser(userId);
    const eventWhere = this.eventWhere(user.id, range, type);

    if (kind === "sources") {
      const events = await this.prisma.watchEvent.findMany({
        where: eventWhere,
        select: { source: true },
      });
      const counts = new Map<string, number>();
      for (const e of events) {
        const name = (e.source || "unknown").trim() || "unknown";
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      const periodWatches = events.length;
      return {
        periodWatches,
        items: [...counts.entries()]
          .map(([name, count]) => ({ key: name, label: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
    }

    const events = await this.prisma.watchEvent.findMany({
      where: eventWhere,
      select: {
        title: { select: { year: true } },
      },
    });
    const counts = new Map<number, number>();
    let unknown = 0;
    for (const e of events) {
      const year = e.title.year;
      if (year == null) {
        unknown += 1;
        continue;
      }
      counts.set(year, (counts.get(year) || 0) + 1);
    }
    const items = [...counts.entries()]
      .map(([year, count]) => ({
        key: String(year),
        label: String(year),
        count,
      }))
      .sort((a, b) => Number(b.key) - Number(a.key))
      .slice(0, limit);
    if (unknown > 0 && items.length < limit) {
      items.push({ key: "unknown", label: "Unknown", count: unknown });
    }
    return { periodWatches: events.length, items };
  }

  async recent(userId?: string, page = 1, pageSize = 40) {
    const user = await this.resolveUser(userId);
    const where = { userId: user.id };
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;
    const [total, rows] = await Promise.all([
      this.prisma.watchEvent.count({ where }),
      this.prisma.watchEvent.findMany({
        where,
        orderBy: { watchedAt: "desc" },
        skip,
        take,
        include: {
          title: { include: { genres: { include: { genre: true } } } },
          episode: true,
        },
      }),
    ]);
    return {
      total,
      page: safePage,
      pageSize: take,
      items: rows.map((r) => ({
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
      })),
    };
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
