import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/music/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/music/users/users.service";
import type { PlayingNowService } from "../../src/music/playing-now/playing-now.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";

const artistListen = (id: string, name: string) => ({
  track: { artist: { id, name, imageUrl: null }, featuredArtists: [] },
});

describe("AnalyticsService music read endpoints", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const loadLabelsForUser = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    loadLabelsForUser.mockReset().mockResolvedValue(new Map());
    const prisma = {
      listen: { count, findMany },
    } as unknown as PrismaService;
    const users = {
      findById: vi.fn().mockResolvedValue({ id: "user-1" }),
    } as unknown as UsersService;
    const corrections = {
      loadLabelsForUser,
      loadArtistCreditsForUser: vi.fn().mockResolvedValue(new Map()),
    } as unknown as CorrectionsService;
    service = new AnalyticsService(
      prisma,
      users,
      {} as PlayingNowService,
      corrections,
    );
  });

  describe("movers", () => {
    it("ranks movers and concentration against the previous window", async () => {
      count.mockResolvedValueOnce(4).mockResolvedValueOnce(4);
      findMany
        .mockResolvedValueOnce([
          artistListen("b", "B"),
          artistListen("b", "B"),
          artistListen("a", "A"),
          artistListen("c", "C"),
        ])
        .mockResolvedValueOnce([
          artistListen("a", "A"),
          artistListen("a", "A"),
          artistListen("b", "B"),
          artistListen("d", "D"),
        ]);

      const result = await service.movers("user-1", "artists", "week", 5);

      expect(result.periodListens).toBe(4);
      expect(result.previousListens).toBe(4);
      expect(result.concentration).toEqual({
        topN: 10,
        share: 100,
        previousShare: 100,
        delta: 0,
      });
      const byId = new Map(result.movers.map((m) => [m.id, m]));
      expect(byId.get("b")).toMatchObject({ rank: 1, previousRank: 2, delta: 1 });
      expect(byId.get("a")).toMatchObject({ rank: 2, previousRank: 1, delta: -1 });
      expect(byId.get("c")).toMatchObject({ isNew: true, previousRank: null });
      const previousWhere = findMany.mock.calls[1]?.[0]?.where;
      expect(previousWhere.listenedAt.lt).toBeInstanceOf(Date);
    });

    it("skips the comparison for the all-time range", async () => {
      count.mockResolvedValueOnce(1);
      findMany.mockResolvedValueOnce([artistListen("a", "A")]);

      const result = await service.movers("user-1", "artists", "all");

      expect(result.movers).toEqual([]);
      expect(result.concentration.previousShare).toBeNull();
      expect(count).toHaveBeenCalledTimes(1);
    });
  });

  describe("recent filters", () => {
    it("combines search and source filters in the listen query", async () => {
      count.mockResolvedValue(0);
      findMany.mockResolvedValue([]);

      await service.recent("user-1", 1, 20, { q: " moon ", source: "lastfm" });

      const where = count.mock.calls[0]?.[0]?.where;
      expect(where.userId).toBe("user-1");
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0].track.OR[0]).toEqual({
        title: { contains: "moon", mode: "insensitive" },
      });
      expect(where.AND[1]).toEqual({
        submissionClient: { in: ["questory_lastfm"] },
      });
    });

    it("keeps the unfiltered query when no filters are given", async () => {
      count.mockResolvedValue(0);
      findMany.mockResolvedValue([]);

      await service.recent("user-1", 1, 20);

      expect(count.mock.calls[0]?.[0]?.where).toEqual({ userId: "user-1" });
    });
  });

  describe("insights compare", () => {
    it("reports previous-period minutes and the longest streak", async () => {
      const listen = (iso: string, durationMs: number | null) => ({
        trackId: "t1",
        listenedAt: new Date(iso),
        musicService: null,
        submissionClient: null,
        mediaPlayer: null,
        track: { artistId: "a1", durationMs, genres: [] },
      });
      findMany
        .mockResolvedValueOnce([
          listen("2026-10-20T10:00:00.000Z", 240_000),
          listen("2026-10-21T10:00:00.000Z", 360_000),
          listen("2026-10-22T10:00:00.000Z", null),
        ])
        .mockResolvedValueOnce([
          { track: { durationMs: 300_000 } },
          { track: { durationMs: 300_000 } },
        ]);
      const prismaWithGroupBy = service as unknown as {
        prisma: { listen: Record<string, unknown> };
      };
      prismaWithGroupBy.prisma.listen.groupBy = vi.fn().mockResolvedValue([]);
      prismaWithGroupBy.prisma.listen.findFirst = vi.fn().mockResolvedValue(null);

      const result = await service.insights("user-1", "week", "UTC");

      expect(result.listeningMinutes).toBe(10);
      expect(result.longestStreakDays).toBe(3);
      expect(result.compare).toEqual({
        previousListens: 2,
        deltaPct: 50,
        previousMinutes: 10,
        minutesDeltaPct: 0,
      });
    });
  });
});
