import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  computeStreakDays,
  zonedDayKey,
  zonedHour,
  zonedIsoWeekKey,
  zonedWeekday,
} from "../../lib/timezone";
import { PlayingNowService } from "../playing-now/playing-now.service";
import { UsersService } from "../users/users.service";
import { CorrectionsService } from "../corrections/corrections.service";
import {
  resolveMusicService,
  resolveMusicServiceLabel,
} from "../lib/music-service";

export type RangeKey = "day" | "week" | "month" | "year" | "all";
export type TopsKind = "artists" | "albums" | "tracks" | "genres" | "moods";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_MON_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function sunWeekdayToMonFirst(sunWeekday: number): number {
  return (sunWeekday + 6) % 7;
}

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
    private readonly playingNowStore: PlayingNowService,
    private readonly corrections: CorrectionsService,
  ) {}

  private async resolveUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Music user not found");
    return user;
  }

  private listenWhere(userId: string, range: RangeKey) {
    const since = rangeStart(range);
    return {
      userId,
      ...(since ? { listenedAt: { gte: since } } : {}),
    };
  }

  async overview(userId: string, timeZone = "UTC") {
    const user = await this.resolveUser(userId);
    const [totalListens, distinctTracks, distinctArtists, latest, earliest] =
      await Promise.all([
        this.prisma.listen.count({ where: { userId: user.id } }),
        this.prisma.listen
          .findMany({
            where: { userId: user.id },
            select: { trackId: true },
            distinct: ["trackId"],
          })
          .then((r) => r.length),
        this.prisma.listen
          .findMany({
            where: { userId: user.id },
            select: { track: { select: { artistId: true } } },
            distinct: ["trackId"],
          })
          .then((rows) => new Set(rows.map((r) => r.track.artistId)).size),
        this.prisma.listen.findFirst({
          where: { userId: user.id },
          orderBy: { listenedAt: "desc" },
        }),
        this.prisma.listen.findFirst({
          where: { userId: user.id },
          orderBy: { listenedAt: "asc" },
        }),
      ]);

    const streakDays = await this.computeStreak(user.id, timeZone);
    const username =
      (await this.users.getListenbrainzUsername(user.id)) || user.personaName;

    return {
      username,
      totalListens,
      uniqueTracks: distinctTracks,
      uniqueArtists: distinctArtists,
      latestListenAt: latest?.listenedAt?.toISOString() ?? null,
      earliestListenAt: earliest?.listenedAt?.toISOString() ?? null,
      streakDays,
    };
  }

  async tops(
    userId: string,
    kind: TopsKind,
    range: RangeKey,
    page = 1,
    pageSize = 20,
  ) {
    const user = await this.resolveUser(userId);
    const listenWhere = this.listenWhere(user.id, range);
    const periodListens = await this.prisma.listen.count({ where: listenWhere });
    const pageSafe = Math.max(1, page);
    const sizeSafe = Math.min(100, Math.max(1, pageSize));
    const start = (pageSafe - 1) * sizeSafe;

    const pageResult = <T>(items: T[]) => ({
      periodListens,
      total: items.length,
      page: pageSafe,
      pageSize: sizeSafe,
      items: items.slice(start, start + sizeSafe),
    });

    if (kind === "artists") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          track: {
            select: {
              artist: { select: { id: true, name: true, imageUrl: true } },
              featuredArtists: {
                select: {
                  artist: { select: { id: true, name: true, imageUrl: true } },
                },
              },
            },
          },
        },
      });
      const counts = new Map<
        string,
        { id: string; name: string; imageUrl: string | null; count: number }
      >();
      const bump = (a: { id: string; name: string; imageUrl: string | null }) => {
        const cur = counts.get(a.id) || {
          id: a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          count: 0,
        };
        cur.count += 1;
        counts.set(a.id, cur);
      };
      for (const l of listens) {
        bump(l.track.artist);
        for (const fa of l.track.featuredArtists) {
          bump(fa.artist);
        }
      }
      const artistLabels = await this.corrections.loadLabelsForUser(
        user.id,
        "artist",
        [...counts.keys()],
      );
      const items = [...counts.values()]
        .map((a) => ({
          ...a,
          name: artistLabels.get(a.id) ?? a.name,
        }))
        .sort((a, b) => b.count - a.count);
      return pageResult(items);
    }

    if (kind === "albums") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          track: {
            select: {
              release: { select: { id: true, title: true, imageUrl: true } },
              artist: { select: { name: true } },
            },
          },
        },
      });
      const counts = new Map<
        string,
        {
          id: string;
          title: string;
          artistName: string;
          imageUrl: string | null;
          count: number;
        }
      >();
      for (const l of listens) {
        const r = l.track.release;
        if (!r) continue;
        const cur = counts.get(r.id) || {
          id: r.id,
          title: r.title,
          artistName: l.track.artist.name,
          imageUrl: r.imageUrl,
          count: 0,
        };
        cur.count += 1;
        counts.set(r.id, cur);
      }
      const albumLabels = await this.corrections.loadLabelsForUser(
        user.id,
        "release",
        [...counts.keys()],
      );
      const items = [...counts.values()]
        .map((a) => ({
          ...a,
          title: albumLabels.get(a.id) ?? a.title,
        }))
        .sort((a, b) => b.count - a.count);
      return pageResult(items);
    }

    if (kind === "tracks") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          track: {
            select: {
              id: true,
              title: true,
              artist: { select: { name: true } },
              release: { select: { title: true, imageUrl: true } },
            },
          },
        },
      });
      const counts = new Map<
        string,
        {
          id: string;
          title: string;
          artistName: string;
          releaseTitle: string | null;
          imageUrl: string | null;
          count: number;
        }
      >();
      for (const l of listens) {
        const t = l.track;
        const cur = counts.get(t.id) || {
          id: t.id,
          title: t.title,
          artistName: t.artist.name,
          releaseTitle: t.release?.title ?? null,
          imageUrl: t.release?.imageUrl ?? null,
          count: 0,
        };
        cur.count += 1;
        counts.set(t.id, cur);
      }
      const trackLabels = await this.corrections.loadLabelsForUser(
        user.id,
        "track",
        [...counts.keys()],
      );
      const items = [...counts.values()]
        .map((t) => ({
          ...t,
          title: trackLabels.get(t.id) ?? t.title,
        }))
        .sort((a, b) => b.count - a.count);
      return pageResult(items);
    }

    // genres | moods
    const wantMood = kind === "moods";
    const listens = await this.prisma.listen.findMany({
      where: listenWhere,
      select: {
        track: {
          select: {
            genres: {
              select: {
                genre: {
                  select: { id: true, name: true, slug: true, kind: true },
                },
              },
            },
          },
        },
      },
    });
    const counts = new Map<
      string,
      { id: string; name: string; slug: string; count: number }
    >();
    for (const l of listens) {
      for (const tg of l.track.genres) {
        const g = tg.genre;
        if (wantMood) {
          if (g.kind !== "mood") continue;
        } else if (g.kind === "mood") {
          continue;
        }
        const cur = counts.get(g.id) || {
          id: g.id,
          name: g.name,
          slug: g.slug,
          count: 0,
        };
        cur.count += 1;
        counts.set(g.id, cur);
      }
    }
    return pageResult(
      [...counts.values()].sort((a, b) => b.count - a.count),
    );
  }

  async timeSeries(
    userId: string,
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week",
    range: RangeKey,
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);

    if (granularity === "hourOfDay" || granularity === "dayOfWeek") {
      const listens = await this.prisma.listen.findMany({
        where: {
          userId: user.id,
          ...(since ? { listenedAt: { gte: since } } : {}),
        },
        select: { listenedAt: true },
      });
      if (granularity === "hourOfDay") {
        const buckets = Array.from({ length: 24 }, (_, hour) => ({
          key: String(hour),
          label: `${hour}:00`,
          count: 0,
        }));
        for (const l of listens) {
          buckets[zonedHour(l.listenedAt, timeZone)].count += 1;
        }
        return buckets;
      }
      const buckets = DOW_LABELS.map((label, i) => ({
        key: String(i),
        label,
        count: 0,
      }));
      for (const l of listens) {
        buckets[zonedWeekday(l.listenedAt, timeZone)].count += 1;
      }
      return buckets;
    }

    const buckets = await this.prisma.listenHourBucket.findMany({
      where: {
        userId: user.id,
        ...(since ? { hourStart: { gte: since } } : {}),
      },
      orderBy: { hourStart: "asc" },
    });

    const rolled = new Map<string, number>();
    for (const b of buckets) {
      const key =
        granularity === "day"
          ? zonedDayKey(b.hourStart, timeZone)
          : zonedIsoWeekKey(b.hourStart, timeZone);
      rolled.set(key, (rolled.get(key) || 0) + b.listenCount);
    }

    return [...rolled.entries()].map(([key, count]) => ({
      key,
      label: key,
      count,
    }));
  }

  async recent(userId: string, page = 1, pageSize = 40) {
    const user = await this.resolveUser(userId);
    const where = { userId: user.id };
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;
    const [total, listens] = await Promise.all([
      this.prisma.listen.count({ where }),
      this.prisma.listen.findMany({
        where,
        orderBy: { listenedAt: "desc" },
        skip,
        take,
        include: {
          track: {
            include: {
              artist: true,
              release: true,
              featuredArtists: {
                include: { artist: true },
                orderBy: { position: "asc" },
              },
              genres: { include: { genre: true }, take: 5 },
            },
          },
        },
      }),
    ]);

    const trackIds = listens.map((l) => l.track.id);
    const artistIds = [
      ...new Set(
        listens.flatMap((l) => [
          l.track.artist.id,
          ...l.track.featuredArtists.map((fa) => fa.artist.id),
        ]),
      ),
    ];
    const releaseIds = listens
      .map((l) => l.track.release?.id)
      .filter((id): id is string => Boolean(id));

    const [trackLabels, artistLabels, releaseLabels] = await Promise.all([
      this.corrections.loadLabelsForUser(user.id, "track", trackIds),
      this.corrections.loadLabelsForUser(user.id, "artist", artistIds),
      this.corrections.loadLabelsForUser(user.id, "release", releaseIds),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      items: listens.map((l) => {
        const primary = l.track.artist;
        const artistName =
          artistLabels.get(primary.id)?.trim() || primary.name;
        return {
          id: l.id,
          listenedAt: l.listenedAt.toISOString(),
          track: {
            id: l.track.id,
            title: trackLabels.get(l.track.id) ?? l.track.title,
            artistId: primary.id,
            artistName,
            releaseId: l.track.release?.id ?? null,
            releaseTitle: l.track.release
              ? (releaseLabels.get(l.track.release.id) ??
                l.track.release.title)
              : null,
            imageUrl: l.track.release?.imageUrl ?? null,
            genres: l.track.genres.map((g) => g.genre.name),
          },
          mediaPlayer: l.mediaPlayer,
          submissionClient: l.submissionClient,
          musicService: resolveMusicService(
            l.musicService,
            l.submissionClient,
          ),
        };
      }),
    };
  }

  async insights(userId: string, range: RangeKey = "week", timeZone = "UTC") {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);
    const listenWhere = this.listenWhere(user.id, range);

    const listens = await this.prisma.listen.findMany({
      where: listenWhere,
      select: {
        trackId: true,
        listenedAt: true,
        musicService: true,
        submissionClient: true,
        mediaPlayer: true,
        track: {
          select: {
            artistId: true,
            durationMs: true,
            genres: {
              select: {
                genre: { select: { id: true, name: true, kind: true } },
              },
            },
          },
        },
      },
    });

    const periodListens = listens.length;
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    const dowBuckets = Array.from({ length: 7 }, () => 0);
    const trackCounts = new Map<string, number>();
    const genreCounts = new Map<string, { name: string; count: number }>();
    const moodCounts = new Map<string, { name: string; count: number }>();
    const serviceCounts = new Map<string, number>();
    let durationSumMs = 0;
    let listensWithDuration = 0;

    for (const l of listens) {
      hourBuckets[zonedHour(l.listenedAt, timeZone)] += 1;
      dowBuckets[zonedWeekday(l.listenedAt, timeZone)] += 1;
      trackCounts.set(l.trackId, (trackCounts.get(l.trackId) || 0) + 1);

      if (l.track.durationMs != null && l.track.durationMs > 0) {
        durationSumMs += l.track.durationMs;
        listensWithDuration += 1;
      }

      const svc = resolveMusicServiceLabel(l.musicService, l.submissionClient);
      serviceCounts.set(svc, (serviceCounts.get(svc) || 0) + 1);

      for (const tg of l.track.genres) {
        const g = tg.genre;
        const map = g.kind === "mood" ? moodCounts : genreCounts;
        const cur = map.get(g.id) || { name: g.name, count: 0 };
        cur.count += 1;
        map.set(g.id, cur);
      }
    }

    const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets, 0));
    const peakDowIdx = dowBuckets.indexOf(Math.max(...dowBuckets, 0));
    const peakHour =
      periodListens > 0 && hourBuckets[peakHourIdx] > 0
        ? {
            hour: peakHourIdx,
            label: hourLabel(peakHourIdx),
            count: hourBuckets[peakHourIdx],
          }
        : null;
    const peakDow =
      periodListens > 0 && dowBuckets[peakDowIdx] > 0
        ? {
            day: peakDowIdx,
            label: DOW_LABELS[peakDowIdx],
            count: dowBuckets[peakDowIdx],
          }
        : null;

    const topGenreEntry = [...genreCounts.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];
    const topMoodEntry = [...moodCounts.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    const topTrackCount = Math.max(0, ...trackCounts.values());
    const topTrackShare =
      periodListens > 0 ? topTrackCount / periodListens : 0;

    const uniqueTrackIds = [...trackCounts.keys()];
    const uniqueArtistIds = [
      ...new Set(listens.map((l) => l.track.artistId)),
    ];

    let newTracks = 0;
    let newArtists = 0;
    if (since && uniqueTrackIds.length > 0) {
      const earliestTracks = await this.prisma.listen.groupBy({
        by: ["trackId"],
        where: { userId: user.id, trackId: { in: uniqueTrackIds } },
        _min: { listenedAt: true },
      });
      newTracks = earliestTracks.filter(
        (row) => row._min.listenedAt && row._min.listenedAt >= since,
      ).length;

      const artistFirsts = await Promise.all(
        uniqueArtistIds.map((artistId) =>
          this.prisma.listen.findFirst({
            where: { userId: user.id, track: { artistId } },
            orderBy: { listenedAt: "asc" },
            select: { listenedAt: true },
          }),
        ),
      );
      newArtists = artistFirsts.filter(
        (row) => row?.listenedAt != null && row.listenedAt >= since,
      ).length;
    } else if (!since) {
      newTracks = uniqueTrackIds.length;
      newArtists = uniqueArtistIds.length;
    }

    const serviceBreakdown = [...serviceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const durationMs = rangeDurationMs(range);
    let previousListens: number | null = null;
    let deltaPct: number | null = null;
    if (durationMs != null && since) {
      const prevStart = new Date(since.getTime() - durationMs);
      previousListens = await this.prisma.listen.count({
        where: {
          userId: user.id,
          listenedAt: { gte: prevStart, lt: since },
        },
      });
      if (previousListens > 0) {
        deltaPct =
          Math.round(
            ((periodListens - previousListens) / previousListens) * 1000,
          ) / 10;
      } else if (periodListens > 0) {
        deltaPct = 100;
      } else {
        deltaPct = 0;
      }
    }

    return {
      range,
      periodListens,
      peakHour,
      peakDow,
      topGenre: topGenreEntry
        ? { id: topGenreEntry[0], name: topGenreEntry[1].name, count: topGenreEntry[1].count }
        : null,
      topMood: topMoodEntry
        ? { id: topMoodEntry[0], name: topMoodEntry[1].name, count: topMoodEntry[1].count }
        : null,
      listeningMinutes: Math.round(durationSumMs / 60000),
      listensWithDuration,
      durationCoverage:
        periodListens > 0
          ? Math.round((listensWithDuration / periodListens) * 1000) / 10
          : 0,
      newArtists,
      newTracks,
      topTrackShare: Math.round(topTrackShare * 1000) / 10,
      uniqueArtists: uniqueArtistIds.length,
      uniqueTracks: uniqueTrackIds.length,
      serviceBreakdown,
      compare: {
        previousListens,
        deltaPct,
      },
    };
  }

  async breakdown(
    userId: string,
    kind: "years" | "services",
    range: RangeKey,
    limit = 20,
  ) {
    const user = await this.resolveUser(userId);
    const listenWhere = this.listenWhere(user.id, range);

    if (kind === "services") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: { musicService: true, submissionClient: true },
      });
      const counts = new Map<string, number>();
      for (const l of listens) {
        const name = resolveMusicServiceLabel(
          l.musicService,
          l.submissionClient,
        );
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      const periodListens = listens.length;
      return {
        periodListens,
        items: [...counts.entries()]
          .map(([name, count]) => ({ key: name, label: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
    }

    // years — release year distribution
    const listens = await this.prisma.listen.findMany({
      where: listenWhere,
      select: {
        track: { select: { release: { select: { year: true } } } },
      },
    });
    const counts = new Map<number, number>();
    let unknown = 0;
    for (const l of listens) {
      const year = l.track.release?.year;
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
    if (unknown > 0) {
      items.push({ key: "unknown", label: "Unknown", count: unknown });
    }
    return { periodListens: listens.length, items };
  }

  async playingNow(userId: string) {
    const user = await this.resolveUser(userId);
    return this.playingNowStore.getSnapshot(user.id);
  }

  private async assertTrackForUser(trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        release: true,
        genres: { include: { genre: true } },
        featuredArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!track) throw new NotFoundException("Track not found");
    return track;
  }

  private async buildTrackArtists(
    userId: string,
    track: {
      artist: { id: string; name: string };
      featuredArtists: Array<{ artist: { id: string; name: string } }>;
    },
  ) {
    const artistIds = [
      track.artist.id,
      ...track.featuredArtists.map((fa) => fa.artist.id),
    ];
    const labels = await this.corrections.loadLabelsForUser(
      userId,
      "artist",
      artistIds,
    );
    return [
      {
        id: track.artist.id,
        name: track.artist.name,
        userDisplayName: labels.get(track.artist.id) ?? null,
      },
      ...track.featuredArtists.map((fa) => ({
        id: fa.artist.id,
        name: fa.artist.name,
        userDisplayName: labels.get(fa.artist.id) ?? null,
      })),
    ];
  }

  private trackListenPatterns(
    listens: Array<{
      listenedAt: Date;
      musicService: string | null;
      submissionClient: string | null;
    }>,
    durationMs: number | null | undefined,
    timeZone = "UTC",
  ) {
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    const dowMonBuckets = Array.from({ length: 7 }, () => 0);
    const serviceCounts = new Map<string, number>();
    const uniqueDayKeys = new Set<string>();

    for (const l of listens) {
      hourBuckets[zonedHour(l.listenedAt, timeZone)] += 1;
      dowMonBuckets[
        sunWeekdayToMonFirst(zonedWeekday(l.listenedAt, timeZone))
      ] += 1;
      uniqueDayKeys.add(zonedDayKey(l.listenedAt, timeZone));
      const svc = resolveMusicServiceLabel(l.musicService, l.submissionClient);
      serviceCounts.set(svc, (serviceCounts.get(svc) || 0) + 1);
    }

    const listenCount = listens.length;
    const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets, 0));
    const peakDowIdx = dowMonBuckets.indexOf(Math.max(...dowMonBuckets, 0));
    const peakHour =
      listenCount > 0 && hourBuckets[peakHourIdx] > 0
        ? {
            hour: peakHourIdx,
            label: hourLabel(peakHourIdx),
            count: hourBuckets[peakHourIdx],
          }
        : null;
    const peakDow =
      listenCount > 0 && dowMonBuckets[peakDowIdx] > 0
        ? {
            day: peakDowIdx,
            label: DOW_MON_LABELS[peakDowIdx],
            count: dowMonBuckets[peakDowIdx],
          }
        : null;

    const topServiceEntry = [...serviceCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const topService =
      topServiceEntry && listenCount > 0
        ? { name: topServiceEntry[0], count: topServiceEntry[1] }
        : null;

    const uniqueDays = uniqueDayKeys.size;
    const listeningMinutes =
      durationMs != null && durationMs > 0
        ? Math.round((listenCount * durationMs) / 60_000)
        : 0;
    const avgListensPerDay =
      uniqueDays > 0
        ? Math.round((listenCount / uniqueDays) * 10) / 10
        : 0;

    return {
      listenCount,
      listeningMinutes,
      uniqueDays,
      avgListensPerDay,
      peakHour,
      peakDow,
      topService,
    };
  }

  async trackDetail(
    userId: string,
    trackId: string,
    range: RangeKey = "all",
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    const track = await this.assertTrackForUser(trackId);

    const where = { trackId, ...this.listenWhere(user.id, range) };
    const [listenCount, listens, first, latest] = await Promise.all([
      this.prisma.listen.count({ where }),
      this.prisma.listen.findMany({
        where,
        select: { listenedAt: true, musicService: true, submissionClient: true },
      }),
      this.prisma.listen.findFirst({
        where: { userId: user.id, trackId },
        orderBy: { listenedAt: "asc" },
      }),
      this.prisma.listen.findFirst({
        where,
        orderBy: { listenedAt: "desc" },
      }),
    ]);

    const patterns = this.trackListenPatterns(
      listens,
      track.durationMs,
      timeZone,
    );

    const [trackLabel, releaseLabel, artists] = await Promise.all([
      this.corrections.resolveDisplayName(
        user.id,
        "track",
        track.id,
        track.title,
      ),
      track.release
        ? this.corrections.resolveDisplayName(
            user.id,
            "release",
            track.release.id,
            track.release.title,
          )
        : Promise.resolve(null),
      this.buildTrackArtists(user.id, track),
    ]);

    const primaryArtist = artists[0];

    return {
      range,
      track: {
        id: track.id,
        title: track.title,
        userDisplayName: trackLabel !== track.title ? trackLabel : null,
        artistName:
          primaryArtist.userDisplayName?.trim() || primaryArtist.name,
        artistId: primaryArtist.id,
        artists,
        releaseTitle: releaseLabel,
        releaseId: track.release?.id ?? null,
        imageUrl: track.release?.imageUrl ?? null,
        releaseImageManual: track.release?.imageManual ?? false,
        recordingMbid: track.recordingMbid,
        spotifyId: track.spotifyId,
        durationMs: track.durationMs,
        genres: track.genres.map((g) => ({
          name: g.genre.name,
          kind: g.genre.kind,
          source: g.source,
        })),
      },
      listenCount,
      firstListenAt: first?.listenedAt.toISOString() ?? null,
      latestListenAt: latest?.listenedAt.toISOString() ?? null,
      listeningMinutes: patterns.listeningMinutes,
      uniqueDays: patterns.uniqueDays,
      avgListensPerDay: patterns.avgListensPerDay,
      peakHour: patterns.peakHour,
      peakDow: patterns.peakDow,
      topService: patterns.topService,
    };
  }

  async trackListens(
    userId: string,
    trackId: string,
    range: RangeKey = "all",
    page = 1,
    pageSize = 20,
  ) {
    const user = await this.resolveUser(userId);
    await this.assertTrackForUser(trackId);

    const where = { trackId, ...this.listenWhere(user.id, range) };
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;

    const [total, listens] = await Promise.all([
      this.prisma.listen.count({ where }),
      this.prisma.listen.findMany({
        where,
        orderBy: { listenedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          listenedAt: true,
          musicService: true,
          submissionClient: true,
          mediaPlayer: true,
        },
      }),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      items: listens.map((l) => ({
        id: l.id,
        listenedAt: l.listenedAt.toISOString(),
        musicService: resolveMusicService(l.musicService, l.submissionClient),
        mediaPlayer: l.mediaPlayer,
      })),
    };
  }

  async trackTimeSeries(
    userId: string,
    trackId: string,
    granularity: "hourOfDay" | "dayOfWeek",
    range: RangeKey = "all",
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    await this.assertTrackForUser(trackId);

    const where = { trackId, ...this.listenWhere(user.id, range) };
    const listens = await this.prisma.listen.findMany({
      where,
      select: { listenedAt: true },
    });

    if (granularity === "hourOfDay") {
      const buckets = Array.from({ length: 24 }, (_, hour) => ({
        key: String(hour),
        label: hourLabel(hour),
        count: 0,
      }));
      for (const l of listens) {
        buckets[zonedHour(l.listenedAt, timeZone)].count += 1;
      }
      return buckets;
    }

    const buckets = DOW_MON_LABELS.map((label, i) => ({
      key: String(i),
      label,
      count: 0,
    }));
    for (const l of listens) {
      buckets[
        sunWeekdayToMonFirst(zonedWeekday(l.listenedAt, timeZone))
      ].count += 1;
    }
    return buckets;
  }

  async trackHeatmap(
    userId: string,
    trackId: string,
    range: RangeKey = "all",
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    await this.assertTrackForUser(trackId);

    const where = { trackId, ...this.listenWhere(user.id, range) };
    const listens = await this.prisma.listen.findMany({
      where,
      select: { listenedAt: true },
    });

    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const l of listens) {
      const day = sunWeekdayToMonFirst(zonedWeekday(l.listenedAt, timeZone));
      const hour = zonedHour(l.listenedAt, timeZone);
      matrix[day][hour] += 1;
    }

    let maxCount = 0;
    const cells: Array<{ day: number; hour: number; count: number }> = [];
    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const count = matrix[day][hour];
        if (count > maxCount) maxCount = count;
        cells.push({ day, hour, count });
      }
    }

    return {
      dayLabels: DOW_MON_LABELS,
      hourLabels: Array.from({ length: 24 }, (_, hour) => hourLabel(hour)),
      cells,
      maxCount,
    };
  }

  private aggregateMoodsFromListens(
    listenRows: Array<{
      track: {
        genres: Array<{ genre: { id: string; name: string; kind: string } }>;
      };
    }>,
    limit?: number,
  ) {
    const moodCounts = new Map<string, { id: string; name: string; count: number }>();
    for (const l of listenRows) {
      for (const tg of l.track.genres) {
        if (tg.genre.kind !== "mood") continue;
        const cur = moodCounts.get(tg.genre.id) || {
          id: tg.genre.id,
          name: tg.genre.name,
          count: 0,
        };
        cur.count += 1;
        moodCounts.set(tg.genre.id, cur);
      }
    }
    return [...moodCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit ?? undefined);
  }

  async artistDetail(
    userId: string,
    artistId: string,
    range: RangeKey = "all",
  ) {
    const user = await this.resolveUser(userId);
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      include: { genres: { include: { genre: true } } },
    });
    if (!artist) throw new NotFoundException("Artist not found");

    const rangeWhere = {
      userId: user.id,
      track: {
        OR: [
          { artistId },
          { featuredArtists: { some: { artistId } } },
        ],
      },
      ...(rangeStart(range) ? { listenedAt: { gte: rangeStart(range)! } } : {}),
    };

    const listenCount = await this.prisma.listen.count({ where: rangeWhere });
    const first = await this.prisma.listen.findFirst({
      where: {
        userId: user.id,
        track: {
          OR: [
            { artistId },
            { featuredArtists: { some: { artistId } } },
          ],
        },
      },
      orderBy: { listenedAt: "asc" },
    });
    const latest = await this.prisma.listen.findFirst({
      where: {
        userId: user.id,
        track: {
          OR: [
            { artistId },
            { featuredArtists: { some: { artistId } } },
          ],
        },
      },
      orderBy: { listenedAt: "desc" },
    });

    const artistListens = await this.prisma.listen.findMany({
      where: rangeWhere,
      select: {
        track: {
          select: {
            id: true,
            title: true,
            displayName: true,
            releaseId: true,
            release: {
              select: { id: true, title: true, displayName: true, imageUrl: true },
            },
            genres: { include: { genre: true } },
          },
        },
      },
    });

    const artistTracks = new Map<
      string,
      {
        id: string;
        title: string;
        releaseTitle: string | null;
        imageUrl: string | null;
        count: number;
      }
    >();
    const artistAlbums = new Map<
      string,
      { id: string; title: string; imageUrl: string | null; count: number }
    >();

    const trackIds = artistListens.map((l) => l.track.id);
    const releaseIds = artistListens
      .map((l) => l.track.release?.id)
      .filter((id): id is string => Boolean(id));
    const [trackLabels, releaseLabels] = await Promise.all([
      this.corrections.loadLabelsForUser(user.id, "track", trackIds),
      this.corrections.loadLabelsForUser(user.id, "release", releaseIds),
    ]);

    for (const l of artistListens) {
      const t = l.track;
      const trackTitle =
        trackLabels.get(t.id) ?? t.displayName ?? t.title;
      const cur = artistTracks.get(t.id) || {
        id: t.id,
        title: trackTitle,
        releaseTitle: t.release
          ? (releaseLabels.get(t.release.id) ??
            t.release.displayName ??
            t.release.title)
          : null,
        imageUrl: t.release?.imageUrl ?? null,
        count: 0,
      };
      cur.count += 1;
      artistTracks.set(t.id, cur);

      if (t.release) {
        const r = t.release;
        const albumTitle =
          releaseLabels.get(r.id) ?? r.displayName ?? r.title;
        const ac = artistAlbums.get(r.id) || {
          id: r.id,
          title: albumTitle,
          imageUrl: r.imageUrl,
          count: 0,
        };
        ac.count += 1;
        artistAlbums.set(r.id, ac);
      }
    }

    const topAlbums = [...artistAlbums.values()].sort(
      (a, b) => b.count - a.count,
    );
    const imageUrl =
      artist.imageUrl ?? topAlbums.find((a) => a.imageUrl)?.imageUrl ?? null;

    const userDisplayName = await this.corrections.resolveDisplayName(
      user.id,
      "artist",
      artist.id,
      artist.name,
    );

    return {
      range,
      artist: {
        id: artist.id,
        name: artist.name,
        userDisplayName: userDisplayName !== artist.name ? userDisplayName : null,
        mbid: artist.mbid,
        imageUrl,
        imageManual: artist.imageManual,
        genres: artist.genres.map((g) => g.genre.name),
      },
      listenCount,
      firstListenAt: first?.listenedAt.toISOString() ?? null,
      latestListenAt: latest?.listenedAt.toISOString() ?? null,
      topTracks: [...artistTracks.values()].sort((a, b) => b.count - a.count),
      topAlbums,
      topMoods: this.aggregateMoodsFromListens(artistListens),
    };
  }

  private albumListenWhere(userId: string, albumId: string, range: RangeKey) {
    const since = rangeStart(range);
    return {
      userId,
      track: { releaseId: albumId },
      ...(since ? { listenedAt: { gte: since } } : {}),
    };
  }

  private async assertAlbum(albumId: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: albumId },
      include: { artist: true },
    });
    if (!release) throw new NotFoundException("Album not found");
    return release;
  }

  private albumListenPatterns(
    listens: Array<{
      listenedAt: Date;
      track: { durationMs: number | null };
    }>,
    timeZone = "UTC",
  ) {
    const hourBuckets = Array.from({ length: 24 }, () => 0);
    const dowMonBuckets = Array.from({ length: 7 }, () => 0);
    let durationSumMs = 0;

    for (const l of listens) {
      hourBuckets[zonedHour(l.listenedAt, timeZone)] += 1;
      dowMonBuckets[
        sunWeekdayToMonFirst(zonedWeekday(l.listenedAt, timeZone))
      ] += 1;
      if (l.track.durationMs != null && l.track.durationMs > 0) {
        durationSumMs += l.track.durationMs;
      }
    }

    const listenCount = listens.length;
    const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets, 0));
    const peakDowIdx = dowMonBuckets.indexOf(Math.max(...dowMonBuckets, 0));
    const peakHour =
      listenCount > 0 && hourBuckets[peakHourIdx] > 0
        ? {
            hour: peakHourIdx,
            label: hourLabel(peakHourIdx),
            count: hourBuckets[peakHourIdx],
          }
        : null;
    const peakDow =
      listenCount > 0 && dowMonBuckets[peakDowIdx] > 0
        ? {
            day: peakDowIdx,
            label: DOW_MON_LABELS[peakDowIdx],
            count: dowMonBuckets[peakDowIdx],
          }
        : null;

    return {
      listeningMinutes: Math.round(durationSumMs / 60_000),
      peakHour,
      peakDow,
    };
  }

  async albumListens(
    userId: string,
    albumId: string,
    range: RangeKey = "all",
    page = 1,
    pageSize = 20,
  ) {
    const user = await this.resolveUser(userId);
    await this.assertAlbum(albumId);

    const where = this.albumListenWhere(user.id, albumId, range);
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;

    const [total, listens] = await Promise.all([
      this.prisma.listen.count({ where }),
      this.prisma.listen.findMany({
        where,
        orderBy: { listenedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          listenedAt: true,
          musicService: true,
          submissionClient: true,
          mediaPlayer: true,
          track: {
            select: { id: true, title: true, displayName: true },
          },
        },
      }),
    ]);

    const trackLabels = await this.corrections.loadLabelsForUser(
      user.id,
      "track",
      listens.map((l) => l.track.id),
    );

    return {
      total,
      page: safePage,
      pageSize: take,
      items: listens.map((l) => ({
        id: l.id,
        listenedAt: l.listenedAt.toISOString(),
        track: {
          id: l.track.id,
          title: trackLabels.get(l.track.id) ?? l.track.title,
        },
        musicService: resolveMusicService(l.musicService, l.submissionClient),
        mediaPlayer: l.mediaPlayer,
      })),
    };
  }

  async albumTimeSeries(
    userId: string,
    albumId: string,
    granularity: "hourOfDay" | "dayOfWeek",
    range: RangeKey = "all",
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    await this.assertAlbum(albumId);

    const listens = await this.prisma.listen.findMany({
      where: this.albumListenWhere(user.id, albumId, range),
      select: { listenedAt: true },
    });

    if (granularity === "hourOfDay") {
      const buckets = Array.from({ length: 24 }, (_, hour) => ({
        key: String(hour),
        label: hourLabel(hour),
        count: 0,
      }));
      for (const l of listens) {
        buckets[zonedHour(l.listenedAt, timeZone)].count += 1;
      }
      return buckets;
    }

    const buckets = DOW_MON_LABELS.map((label, i) => ({
      key: String(i),
      label,
      count: 0,
    }));
    for (const l of listens) {
      buckets[
        sunWeekdayToMonFirst(zonedWeekday(l.listenedAt, timeZone))
      ].count += 1;
    }
    return buckets;
  }

  async albumDetail(
    userId: string,
    albumId: string,
    range: RangeKey = "all",
    timeZone = "UTC",
  ) {
    const user = await this.resolveUser(userId);
    const release = await this.assertAlbum(albumId);

    const rangeWhere = this.albumListenWhere(user.id, albumId, range);

    const listenCount = await this.prisma.listen.count({ where: rangeWhere });
    const first = await this.prisma.listen.findFirst({
      where: { userId: user.id, track: { releaseId: albumId } },
      orderBy: { listenedAt: "asc" },
    });
    const latest = await this.prisma.listen.findFirst({
      where: rangeWhere,
      orderBy: { listenedAt: "desc" },
    });

    const listens = await this.prisma.listen.findMany({
      where: rangeWhere,
      select: {
        listenedAt: true,
        track: {
          select: {
            id: true,
            title: true,
            displayName: true,
            durationMs: true,
            genres: { include: { genre: true } },
          },
        },
      },
    });
    const trackCounts = new Map<
      string,
      { id: string; title: string; durationMs: number | null; count: number }
    >();
    const trackLabels = await this.corrections.loadLabelsForUser(
      user.id,
      "track",
      listens.map((l) => l.track.id),
    );
    for (const l of listens) {
      const t = l.track;
      const trackTitle = trackLabels.get(t.id) ?? t.title;
      const cur = trackCounts.get(t.id) || {
        id: t.id,
        title: trackTitle,
        durationMs: t.durationMs,
        count: 0,
      };
      cur.count += 1;
      trackCounts.set(t.id, cur);
    }

    const userDisplayName = await this.corrections.resolveDisplayName(
      user.id,
      "release",
      release.id,
      release.title,
    );

    const patterns = this.albumListenPatterns(listens, timeZone);

    return {
      range,
      album: {
        id: release.id,
        title: release.title,
        userDisplayName:
          userDisplayName !== release.title ? userDisplayName : null,
        year: release.year,
        imageUrl: release.imageUrl,
        imageManual: release.imageManual,
        mbid: release.mbid,
        artistId: release.artist?.id ?? null,
        artistName: release.artist?.name ?? null,
      },
      listenCount,
      firstListenAt: first?.listenedAt.toISOString() ?? null,
      latestListenAt: latest?.listenedAt.toISOString() ?? null,
      listeningMinutes: patterns.listeningMinutes,
      peakHour: patterns.peakHour,
      peakDow: patterns.peakDow,
      topTracks: [...trackCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 25),
      topMoods: this.aggregateMoodsFromListens(listens, 10),
    };
  }

  private async computeStreak(
    userId: string,
    timeZone = "UTC",
  ): Promise<number> {
    const listens = await this.prisma.listen.findMany({
      where: { userId },
      select: { listenedAt: true },
      orderBy: { listenedAt: "desc" },
      take: 2000,
    });
    return computeStreakDays(
      listens.map((l) => l.listenedAt),
      timeZone,
    );
  }
}
