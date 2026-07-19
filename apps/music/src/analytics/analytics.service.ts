import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

export type RangeKey = "day" | "week" | "month" | "year" | "all";
export type TopsKind = "artists" | "albums" | "tracks" | "genres" | "moods";

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

  async overview(userId: string) {
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

    const streakDays = await this.computeStreak(user.id);
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

  async tops(userId: string, kind: TopsKind, range: RangeKey, limit = 20) {
    const user = await this.resolveUser(userId);
    const listenWhere = this.listenWhere(user.id, range);
    const periodListens = await this.prisma.listen.count({ where: listenWhere });

    if (kind === "artists") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          track: {
            select: {
              artist: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      });
      const counts = new Map<
        string,
        { id: string; name: string; imageUrl: string | null; count: number }
      >();
      for (const l of listens) {
        const a = l.track.artist;
        const cur = counts.get(a.id) || {
          id: a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          count: 0,
        };
        cur.count += 1;
        counts.set(a.id, cur);
      }
      return {
        periodListens,
        items: [...counts.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
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
      return {
        periodListens,
        items: [...counts.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
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
      return {
        periodListens,
        items: [...counts.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, limit),
      };
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
    return {
      periodListens,
      items: [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit),
    };
  }

  async timeSeries(
    userId: string,
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week",
    range: RangeKey,
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
          buckets[l.listenedAt.getUTCHours()].count += 1;
        }
        return buckets;
      }
      const buckets = DOW_LABELS.map((label, i) => ({
        key: String(i),
        label,
        count: 0,
      }));
      for (const l of listens) {
        buckets[l.listenedAt.getUTCDay()].count += 1;
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
      const d = b.hourStart;
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
        const week = Math.ceil(
          ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        );
        key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
      }
      rolled.set(key, (rolled.get(key) || 0) + b.listenCount);
    }

    return [...rolled.entries()].map(([key, count]) => ({
      key,
      label: key,
      count,
    }));
  }

  async recent(userId: string, limit = 40) {
    const user = await this.resolveUser(userId);
    const listens = await this.prisma.listen.findMany({
      where: { userId: user.id },
      orderBy: { listenedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        track: {
          include: {
            artist: true,
            release: true,
            genres: { include: { genre: true }, take: 5 },
          },
        },
      },
    });

    return listens.map((l) => ({
      id: l.id,
      listenedAt: l.listenedAt.toISOString(),
      track: {
        id: l.track.id,
        title: l.track.title,
        artistId: l.track.artist.id,
        artistName: l.track.artist.name,
        releaseId: l.track.release?.id ?? null,
        releaseTitle: l.track.release?.title ?? null,
        imageUrl: l.track.release?.imageUrl ?? null,
        genres: l.track.genres.map((g) => g.genre.name),
      },
      mediaPlayer: l.mediaPlayer,
      submissionClient: l.submissionClient,
      musicService: l.musicService,
    }));
  }

  async insights(userId: string, range: RangeKey = "week") {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);
    const listenWhere = this.listenWhere(user.id, range);

    const listens = await this.prisma.listen.findMany({
      where: listenWhere,
      select: {
        trackId: true,
        listenedAt: true,
        musicService: true,
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
      hourBuckets[l.listenedAt.getUTCHours()] += 1;
      dowBuckets[l.listenedAt.getUTCDay()] += 1;
      trackCounts.set(l.trackId, (trackCounts.get(l.trackId) || 0) + 1);

      if (l.track.durationMs != null && l.track.durationMs > 0) {
        durationSumMs += l.track.durationMs;
        listensWithDuration += 1;
      }

      const svc = (l.musicService || "unknown").trim() || "unknown";
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
        select: { musicService: true },
      });
      const counts = new Map<string, number>();
      for (const l of listens) {
        const name = (l.musicService || "unknown").trim() || "unknown";
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
    const row = await this.prisma.playingNow.findUnique({
      where: { userId: user.id },
      include: {
        track: {
          include: {
            artist: true,
            release: true,
          },
        },
      },
    });
    if (!row) return null;
    // Stale if older than 15 minutes
    const ageMs = Date.now() - row.updatedAt.getTime();
    if (ageMs > 15 * 60 * 1000) return null;
    return {
      updatedAt: row.updatedAt.toISOString(),
      track: {
        id: row.track.id,
        title: row.track.title,
        artistId: row.track.artist.id,
        artistName: row.track.artist.name,
        releaseId: row.track.release?.id ?? null,
        releaseTitle: row.track.release?.title ?? null,
        imageUrl: row.track.release?.imageUrl ?? null,
      },
    };
  }

  async trackDetail(userId: string, trackId: string) {
    const user = await this.resolveUser(userId);
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        release: true,
        genres: { include: { genre: true } },
      },
    });
    if (!track) throw new NotFoundException("Track not found");

    const listenCount = await this.prisma.listen.count({
      where: { userId: user.id, trackId },
    });
    const recent = await this.prisma.listen.findMany({
      where: { userId: user.id, trackId },
      orderBy: { listenedAt: "desc" },
      take: 50,
    });
    const first = await this.prisma.listen.findFirst({
      where: { userId: user.id, trackId },
      orderBy: { listenedAt: "asc" },
    });

    return {
      track: {
        id: track.id,
        title: track.title,
        artistName: track.artist.name,
        artistId: track.artist.id,
        releaseTitle: track.release?.title ?? null,
        releaseId: track.release?.id ?? null,
        imageUrl: track.release?.imageUrl ?? null,
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
      latestListenAt: recent[0]?.listenedAt.toISOString() ?? null,
      recentListens: recent.map((l) => l.listenedAt.toISOString()),
    };
  }

  async artistDetail(userId: string, artistId: string) {
    const user = await this.resolveUser(userId);
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      include: { genres: { include: { genre: true } } },
    });
    if (!artist) throw new NotFoundException("Artist not found");

    const listenCount = await this.prisma.listen.count({
      where: { userId: user.id, track: { artistId } },
    });
    const first = await this.prisma.listen.findFirst({
      where: { userId: user.id, track: { artistId } },
      orderBy: { listenedAt: "asc" },
    });
    const latest = await this.prisma.listen.findFirst({
      where: { userId: user.id, track: { artistId } },
      orderBy: { listenedAt: "desc" },
    });

    const artistListens = await this.prisma.listen.findMany({
      where: { userId: user.id, track: { artistId } },
      select: {
        track: {
          select: {
            id: true,
            title: true,
            release: { select: { title: true, imageUrl: true } },
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
    for (const l of artistListens) {
      const t = l.track;
      const cur = artistTracks.get(t.id) || {
        id: t.id,
        title: t.title,
        releaseTitle: t.release?.title ?? null,
        imageUrl: t.release?.imageUrl ?? null,
        count: 0,
      };
      cur.count += 1;
      artistTracks.set(t.id, cur);
    }

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        mbid: artist.mbid,
        imageUrl: artist.imageUrl,
        genres: artist.genres.map((g) => g.genre.name),
      },
      listenCount,
      firstListenAt: first?.listenedAt.toISOString() ?? null,
      latestListenAt: latest?.listenedAt.toISOString() ?? null,
      topTracks: [...artistTracks.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  async albumDetail(userId: string, albumId: string) {
    const user = await this.resolveUser(userId);
    const release = await this.prisma.release.findUnique({
      where: { id: albumId },
      include: { artist: true },
    });
    if (!release) throw new NotFoundException("Album not found");

    const listenCount = await this.prisma.listen.count({
      where: { userId: user.id, track: { releaseId: albumId } },
    });
    const first = await this.prisma.listen.findFirst({
      where: { userId: user.id, track: { releaseId: albumId } },
      orderBy: { listenedAt: "asc" },
    });
    const latest = await this.prisma.listen.findFirst({
      where: { userId: user.id, track: { releaseId: albumId } },
      orderBy: { listenedAt: "desc" },
    });

    const listens = await this.prisma.listen.findMany({
      where: { userId: user.id, track: { releaseId: albumId } },
      select: {
        track: {
          select: {
            id: true,
            title: true,
            durationMs: true,
          },
        },
      },
    });
    const trackCounts = new Map<
      string,
      { id: string; title: string; durationMs: number | null; count: number }
    >();
    for (const l of listens) {
      const t = l.track;
      const cur = trackCounts.get(t.id) || {
        id: t.id,
        title: t.title,
        durationMs: t.durationMs,
        count: 0,
      };
      cur.count += 1;
      trackCounts.set(t.id, cur);
    }

    return {
      album: {
        id: release.id,
        title: release.title,
        year: release.year,
        imageUrl: release.imageUrl,
        mbid: release.mbid,
        artistId: release.artist?.id ?? null,
        artistName: release.artist?.name ?? null,
      },
      listenCount,
      firstListenAt: first?.listenedAt.toISOString() ?? null,
      latestListenAt: latest?.listenedAt.toISOString() ?? null,
      topTracks: [...trackCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 25),
    };
  }

  private async computeStreak(userId: string): Promise<number> {
    const listens = await this.prisma.listen.findMany({
      where: { userId },
      select: { listenedAt: true },
      orderBy: { listenedAt: "desc" },
      take: 2000,
    });
    if (!listens.length) return 0;

    const days = new Set(
      listens.map((l) => l.listenedAt.toISOString().slice(0, 10)),
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
