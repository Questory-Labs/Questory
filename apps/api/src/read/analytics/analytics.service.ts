import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  computeStreakDays,
  zonedDayKey,
  zonedHour,
  zonedIsoWeekKey,
  zonedWeekday,
} from "../../lib/timezone";
import { UsersService } from "../../watch/users/users.service";

export type RangeKey = "day" | "week" | "month" | "year" | "all";
export type FormatFilter =
  | "manga"
  | "manhwa"
  | "manhua"
  | "novel"
  | "one_shot"
  | "other";

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
export class ReadAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async resolveUser(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("Read user not found");
    return user;
  }

  private eventWhere(userId: string, range: RangeKey, format?: FormatFilter) {
    const since = rangeStart(range);
    return {
      userId,
      ...(since ? { readAt: { gte: since } } : {}),
      ...(format ? { readTitle: { format } } : {}),
    };
  }

  async overview(userId?: string, timeZone = "UTC") {
    const user = await this.resolveUser(userId);
    const [
      totalEvents,
      distinctTitles,
      latest,
      earliest,
      listStates,
      chapterRows,
      volumeRows,
    ] = await Promise.all([
      this.prisma.readEvent.count({ where: { userId: user.id } }),
      this.prisma.readEvent
        .findMany({
          where: { userId: user.id },
          select: { readTitleId: true },
          distinct: ["readTitleId"],
        })
        .then((r) => r.length),
      this.prisma.readEvent.findFirst({
        where: { userId: user.id },
        orderBy: { readAt: "desc" },
      }),
      this.prisma.readEvent.findFirst({
        where: { userId: user.id },
        orderBy: { readAt: "asc" },
      }),
      this.prisma.readListState.findMany({
        where: { userId: user.id },
        select: { listStatus: true, progressChapters: true, progressVolumes: true },
      }),
      this.prisma.readListState.groupBy({
        by: ["readTitleId"],
        where: { userId: user.id },
        _max: { progressChapters: true },
      }),
      this.prisma.readListState.groupBy({
        by: ["readTitleId"],
        where: { userId: user.id },
        _max: { progressVolumes: true },
      }),
    ]);

    const chaptersLogged = chapterRows.reduce(
      (sum, r) => sum + (r._max.progressChapters ?? 0),
      0,
    );
    const volumesLogged = volumeRows.reduce(
      (sum, r) => sum + (r._max.progressVolumes ?? 0),
      0,
    );
    const completed = listStates.filter((s) => s.listStatus === "completed").length;
    const tracked = listStates.length;
    const inProgress = listStates.filter((s) => s.listStatus === "reading").length;
    const completionRate =
      tracked > 0 ? Math.round((completed / tracked) * 1000) / 10 : 0;

    return {
      userId: user.id,
      personaName: user.personaName,
      totalEvents,
      uniqueTitles: distinctTitles || tracked,
      chaptersLogged,
      volumesLogged,
      completionRate,
      inProgress,
      latestReadAt: latest?.readAt?.toISOString() ?? null,
      earliestReadAt: earliest?.readAt?.toISOString() ?? null,
      streakDays: await this.computeStreak(user.id, timeZone),
    };
  }

  async tops(
    kind: "titles" | "genres" | "formats",
    range: RangeKey,
    limit = 20,
    userId?: string,
  ) {
    const user = await this.resolveUser(userId);
    const start = rangeStart(range);
    const events = await this.prisma.readEvent.findMany({
      where: {
        userId: user.id,
        ...(start ? { readAt: { gte: start } } : {}),
      },
      include: {
        readTitle: {
          include: { genres: { include: { genre: true } } },
        },
      },
    });

    if (kind === "genres") {
      const counts = new Map<string, { id: string; name: string; count: number }>();
      for (const e of events) {
        for (const tg of e.readTitle.genres) {
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

    if (kind === "formats") {
      const counts = new Map<string, { id: string; name: string; count: number }>();
      for (const e of events) {
        const fmt = e.readTitle.format || "other";
        const cur = counts.get(fmt) || { id: fmt, name: fmt, count: 0 };
        cur.count += 1;
        counts.set(fmt, cur);
      }
      return [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }

    const counts = new Map<
      string,
      {
        id: string;
        name: string;
        format: string;
        coverUrl: string | null;
        count: number;
      }
    >();
    for (const e of events) {
      const cur = counts.get(e.readTitleId) || {
        id: e.readTitleId,
        name: e.readTitle.name,
        format: e.readTitle.format,
        coverUrl: e.readTitle.coverUrl,
        count: 0,
      };
      cur.count += 1;
      counts.set(e.readTitleId, cur);
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async timeSeries(
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week",
    range: RangeKey,
    userId?: string,
    format?: FormatFilter,
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    const events = await this.prisma.readEvent.findMany({
      where: this.eventWhere(user.id, range, format),
      select: { readAt: true },
    });

    if (granularity === "hourOfDay") {
      const buckets = Array.from({ length: 24 }, (_, i) => ({
        key: String(i),
        label: `${String(i).padStart(2, "0")}:00`,
        count: 0,
      }));
      for (const e of events) {
        buckets[zonedHour(e.readAt, timeZone)].count += 1;
      }
      return buckets;
    }
    if (granularity === "dayOfWeek") {
      const buckets = DOW_LABELS.map((label, i) => ({
        key: String(i),
        label,
        count: 0,
      }));
      for (const e of events) {
        buckets[zonedWeekday(e.readAt, timeZone)].count += 1;
      }
      return buckets;
    }

    const map = new Map<string, number>();
    for (const e of events) {
      const key =
        granularity === "day"
          ? zonedDayKey(e.readAt, timeZone)
          : zonedIsoWeekKey(e.readAt, timeZone);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, label: key, count }));
  }

  async insights(
    userId: string,
    range: RangeKey = "week",
    format?: FormatFilter,
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);
    const eventWhere = this.eventWhere(user.id, range, format);

    const events = await this.prisma.readEvent.findMany({
      where: eventWhere,
      select: {
        readTitleId: true,
        readAt: true,
        source: true,
        status: true,
        chaptersRead: true,
        readTitle: {
          select: {
            format: true,
            genres: {
              select: { genre: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    const periodEvents = events.length;
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    const dowBuckets = Array.from({ length: 7 }, () => 0);
    const titleCounts = new Map<string, number>();
    const genreCounts = new Map<string, { name: string; count: number }>();
    const sourceCounts = new Map<string, number>();
    const formatCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    let chaptersLogged = 0;

    for (const e of events) {
      hourBuckets[zonedHour(e.readAt, timeZone)] += 1;
      dowBuckets[zonedWeekday(e.readAt, timeZone)] += 1;
      titleCounts.set(e.readTitleId, (titleCounts.get(e.readTitleId) || 0) + 1);
      chaptersLogged += e.chaptersRead ?? 0;

      const src = (e.source || "unknown").trim() || "unknown";
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);

      const fmt = e.readTitle.format || "other";
      formatCounts.set(fmt, (formatCounts.get(fmt) || 0) + 1);

      if (e.status) {
        statusCounts.set(e.status, (statusCounts.get(e.status) || 0) + 1);
      }

      for (const g of e.readTitle.genres) {
        const cur = genreCounts.get(g.genre.id) || {
          name: g.genre.name,
          count: 0,
        };
        cur.count += 1;
        genreCounts.set(g.genre.id, cur);
      }
    }

    const uniqueTitleIds = [...titleCounts.keys()];
    let newTitles = 0;
    if (since) {
      for (const titleId of uniqueTitleIds) {
        const earlier = await this.prisma.readEvent.findFirst({
          where: {
            userId: user.id,
            readTitleId: titleId,
            readAt: { lt: since },
          },
          select: { id: true },
        });
        if (!earlier) newTitles += 1;
      }
    }

    const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets, 0));
    const peakDowIdx = dowBuckets.indexOf(Math.max(...dowBuckets, 0));
    const peakHour =
      periodEvents > 0 && hourBuckets[peakHourIdx] > 0
        ? {
            hour: peakHourIdx,
            label: hourLabel(peakHourIdx),
            count: hourBuckets[peakHourIdx],
          }
        : null;
    const peakDow =
      periodEvents > 0 && dowBuckets[peakDowIdx] > 0
        ? {
            day: peakDowIdx,
            label: DOW_LABELS[peakDowIdx],
            count: dowBuckets[peakDowIdx],
          }
        : null;

    const topGenreEntry = [...genreCounts.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];
    const topCount = Math.max(0, ...titleCounts.values());
    const topTitleShare =
      periodEvents > 0 ? topCount / periodEvents : 0;

    const durationMs = rangeDurationMs(range);
    let previousEvents: number | null = null;
    let deltaPct: number | null = null;
    if (since && durationMs != null) {
      const prevStart = new Date(since.getTime() - durationMs);
      previousEvents = await this.prisma.readEvent.count({
        where: {
          userId: user.id,
          readAt: { gte: prevStart, lt: since },
          ...(format ? { readTitle: { format } } : {}),
        },
      });
      if (previousEvents > 0) {
        deltaPct =
          Math.round(
            ((periodEvents - previousEvents) / previousEvents) * 1000,
          ) / 10;
      } else if (periodEvents > 0) {
        deltaPct = 100;
      } else {
        deltaPct = 0;
      }
    }

    const toBreakdown = (m: Map<string, number>) =>
      [...m.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      range,
      format: format ?? "all",
      periodEvents,
      peakHour,
      peakDow,
      topGenre: topGenreEntry
        ? {
            id: topGenreEntry[0],
            name: topGenreEntry[1].name,
            count: topGenreEntry[1].count,
          }
        : null,
      chaptersLogged,
      newTitles,
      topTitleShare: Math.round(topTitleShare * 1000) / 10,
      uniqueTitles: uniqueTitleIds.length,
      formatBreakdown: toBreakdown(formatCounts),
      statusBreakdown: toBreakdown(statusCounts),
      sourceBreakdown: toBreakdown(sourceCounts),
      compare: {
        previousEvents,
        deltaPct,
      },
    };
  }

  async breakdown(
    userId: string,
    kind: "years" | "sources" | "formats" | "statuses",
    range: RangeKey,
    limit = 20,
    format?: FormatFilter,
  ) {
    const user = await this.resolveUser(userId);
    const eventWhere = this.eventWhere(user.id, range, format);

    if (kind === "sources" || kind === "formats" || kind === "statuses") {
      const events = await this.prisma.readEvent.findMany({
        where: eventWhere,
        select: {
          source: true,
          status: true,
          readTitle: { select: { format: true } },
        },
      });
      const counts = new Map<string, number>();
      for (const e of events) {
        let name = "unknown";
        if (kind === "sources") name = (e.source || "unknown").trim() || "unknown";
        else if (kind === "formats") name = e.readTitle.format || "other";
        else name = (e.status || "unknown").trim() || "unknown";
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      return {
        periodEvents: events.length,
        items: [...counts.entries()]
          .map(([name, count]) => ({ key: name, label: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
    }

    const events = await this.prisma.readEvent.findMany({
      where: eventWhere,
      select: { readTitle: { select: { year: true } } },
    });
    const counts = new Map<number, number>();
    let unknown = 0;
    for (const e of events) {
      const year = e.readTitle.year;
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
    return { periodEvents: events.length, items };
  }

  async recent(userId?: string, page = 1, pageSize = 40) {
    const user = await this.resolveUser(userId);
    const where = { userId: user.id };
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;
    const [total, rows] = await Promise.all([
      this.prisma.readEvent.count({ where }),
      this.prisma.readEvent.findMany({
        where,
        orderBy: { readAt: "desc" },
        skip,
        take,
        include: {
          readTitle: { include: { genres: { include: { genre: true } } } },
        },
      }),
    ]);
    return {
      total,
      page: safePage,
      pageSize: take,
      items: rows.map((r) => ({
        id: r.id,
        readAt: r.readAt.toISOString(),
        source: r.source,
        status: r.status,
        chaptersRead: r.chaptersRead,
        volumesRead: r.volumesRead,
        progress: r.progress,
        precision: r.precision,
        title: {
          id: r.readTitle.id,
          name: r.readTitle.name,
          format: r.readTitle.format,
          coverUrl: r.readTitle.coverUrl,
          genres: r.readTitle.genres.map((g) => g.genre.name),
        },
      })),
    };
  }

  async titleDetail(userId: string, titleId: string, range: RangeKey = "all") {
    const user = await this.resolveUser(userId);
    const title = await this.prisma.readTitle.findUnique({
      where: { id: titleId },
      include: { genres: { include: { genre: true } } },
    });
    if (!title) throw new NotFoundException("Title not found");

    const since = rangeStart(range);
    const rangeWhere = {
      userId: user.id,
      readTitleId: titleId,
      ...(since ? { readAt: { gte: since } } : {}),
    };

    const [eventCount, first, latest, events, listState] = await Promise.all([
      this.prisma.readEvent.count({ where: rangeWhere }),
      this.prisma.readEvent.findFirst({
        where: { userId: user.id, readTitleId: titleId },
        orderBy: { readAt: "asc" },
      }),
      this.prisma.readEvent.findFirst({
        where: { userId: user.id, readTitleId: titleId },
        orderBy: { readAt: "desc" },
      }),
      this.prisma.readEvent.findMany({
        where: rangeWhere,
        orderBy: { readAt: "desc" },
        take: 50,
      }),
      this.prisma.readListState.findFirst({
        where: { userId: user.id, readTitleId: titleId },
        select: { listStatus: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      range,
      title: {
        id: title.id,
        name: title.name,
        displayName: title.displayName,
        format: title.format,
        year: title.year,
        overview: title.overview,
        coverUrl: title.coverUrl,
        imageManual: title.imageManual,
        publishingStatus: title.publishingStatus,
        chapters: title.chapters,
        volumes: title.volumes,
        genres: title.genres.map((g) => g.genre.name),
      },
      listStatus: listState?.listStatus ?? null,
      eventCount,
      firstReadAt: first?.readAt.toISOString() ?? null,
      latestReadAt: latest?.readAt.toISOString() ?? null,
      recentEvents: events.map((e) => ({
        id: e.id,
        readAt: e.readAt.toISOString(),
        source: e.source,
        status: e.status,
        chaptersRead: e.chaptersRead,
        volumesRead: e.volumesRead,
      })),
    };
  }

  private async computeStreak(userId: string, timeZone = "UTC") {
    const recent = await this.prisma.readEvent.findMany({
      where: { userId },
      select: { readAt: true },
      orderBy: { readAt: "desc" },
      take: 400,
    });
    return computeStreakDays(
      recent.map((r) => r.readAt),
      timeZone,
    );
  }
}
