import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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

  private async resolveUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Music user not found");
    return user;
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

  async tops(
    userId: string,
    kind: "artists" | "albums" | "tracks" | "genres",
    range: RangeKey,
    limit = 20,
  ) {
    const user = await this.resolveUser(userId);
    const since = rangeStart(range);
    const listenWhere = {
      userId: user.id,
      ...(since ? { listenedAt: { gte: since } } : {}),
    };

    if (kind === "artists") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: { track: { select: { artistId: true, artist: { select: { id: true, name: true, imageUrl: true } } } } },
      });
      const counts = new Map<string, { id: string; name: string; imageUrl: string | null; count: number }>();
      for (const l of listens) {
        const a = l.track.artist;
        const cur = counts.get(a.id) || { id: a.id, name: a.name, imageUrl: a.imageUrl, count: 0 };
        cur.count += 1;
        counts.set(a.id, cur);
      }
      return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
    }

    if (kind === "albums") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          track: {
            select: {
              releaseId: true,
              release: { select: { id: true, title: true, imageUrl: true } },
              artist: { select: { name: true } },
            },
          },
        },
      });
      const counts = new Map<
        string,
        { id: string; title: string; artistName: string; imageUrl: string | null; count: number }
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
      return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
    }

    if (kind === "tracks") {
      const listens = await this.prisma.listen.findMany({
        where: listenWhere,
        select: {
          trackId: true,
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
      return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
    }

    // genres
    const listens = await this.prisma.listen.findMany({
      where: listenWhere,
      select: {
        track: {
          select: {
            genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
          },
        },
      },
    });
    const counts = new Map<string, { id: string; name: string; slug: string; count: number }>();
    for (const l of listens) {
      for (const tg of l.track.genres) {
        const g = tg.genre;
        const cur = counts.get(g.id) || { id: g.id, name: g.name, slug: g.slug, count: 0 };
        cur.count += 1;
        counts.set(g.id, cur);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
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
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets = labels.map((label, i) => ({
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
        // ISO week key
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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
        artistName: l.track.artist.name,
        releaseTitle: l.track.release?.title ?? null,
        imageUrl: l.track.release?.imageUrl ?? null,
        genres: l.track.genres.map((g) => g.genre.name),
      },
      mediaPlayer: l.mediaPlayer,
      submissionClient: l.submissionClient,
    }));
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
          source: g.source,
        })),
      },
      listenCount,
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

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        mbid: artist.mbid,
        imageUrl: artist.imageUrl,
        genres: artist.genres.map((g) => g.genre.name),
      },
      listenCount,
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
