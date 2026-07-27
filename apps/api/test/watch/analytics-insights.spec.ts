import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/watch/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("AnalyticsService.insights", () => {
  const findMany = vi.fn();
  const groupBy = vi.fn();
  const count = vi.fn();
  const resolveUser = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    // Freeze "now" so rolling week bounds stay aligned with fixture dates.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00.000Z"));
    findMany.mockReset();
    groupBy.mockReset();
    count.mockReset();
    resolveUser.mockReset().mockResolvedValue({ id: "user-1" });
    const prisma = {
      watchEvent: { findMany, groupBy, count },
    } as unknown as PrismaService;
    const users = { resolveUser } as unknown as UsersService;
    service = new AnalyticsService(prisma, users);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns period stats, peaks, genre, and prior-period compare", async () => {
    findMany.mockResolvedValue([
      {
        titleId: "t1",
        watchedAt: new Date("2026-07-20T14:00:00.000Z"),
        source: "trakt",
        runtimeMinutes: 120,
        title: {
          type: "movie",
          runtimeMinutes: 120,
          genres: [{ genre: { id: "g1", name: "Drama" } }],
        },
        episode: null,
      },
      {
        titleId: "t1",
        watchedAt: new Date("2026-07-21T14:30:00.000Z"),
        source: "trakt",
        runtimeMinutes: null,
        title: {
          type: "movie",
          runtimeMinutes: 120,
          genres: [{ genre: { id: "g1", name: "Drama" } }],
        },
        episode: null,
      },
      {
        titleId: "t2",
        watchedAt: new Date("2026-07-22T20:00:00.000Z"),
        source: "letterboxd_csv",
        runtimeMinutes: 45,
        title: {
          type: "show",
          runtimeMinutes: null,
          genres: [{ genre: { id: "g2", name: "Comedy" } }],
        },
        episode: { runtimeMinutes: 45 },
      },
    ]);
    groupBy.mockResolvedValue([
      { titleId: "t1", _min: { watchedAt: new Date("2026-07-20T14:00:00.000Z") } },
      { titleId: "t2", _min: { watchedAt: new Date("2025-01-01T00:00:00.000Z") } },
    ]);
    count.mockResolvedValue(1);

    const result = await service.insights("user-1", "week");

    expect(result.type).toBe("all");
    expect(result.periodWatches).toBe(3);
    expect(result.uniqueTitles).toBe(2);
    expect(result.movieWatches).toBe(2);
    expect(result.showWatches).toBe(1);
    expect(result.movieMinutes).toBe(240);
    expect(result.showMinutes).toBe(45);
    expect(result.uniqueMovies).toBe(1);
    expect(result.uniqueShows).toBe(1);
    expect(result.watchingMinutes).toBe(285);
    expect(result.watchesWithRuntime).toBe(3);
    expect(result.topGenre).toMatchObject({ name: "Drama", count: 2 });
    expect(result.peakHour?.hour).toBe(14);
    expect(result.newTitles).toBe(1);
    expect(result.topTitleShare).toBeCloseTo(66.7, 0);
    expect(result.sourceBreakdown[0]).toMatchObject({
      name: "trakt",
      count: 2,
    });
    expect(result.compare.previousWatches).toBe(1);
    expect(result.compare.deltaPct).toBe(200);
  });

  it("filters insights to movies when type=movie", async () => {
    findMany.mockResolvedValue([
      {
        titleId: "t1",
        watchedAt: new Date("2026-07-20T14:00:00.000Z"),
        source: "trakt",
        runtimeMinutes: 120,
        title: {
          type: "movie",
          runtimeMinutes: 120,
          genres: [{ genre: { id: "g1", name: "Drama" } }],
        },
        episode: null,
      },
    ]);
    groupBy.mockResolvedValue([
      { titleId: "t1", _min: { watchedAt: new Date("2026-07-20T14:00:00.000Z") } },
    ]);
    count.mockResolvedValue(0);

    const result = await service.insights("user-1", "week", "movie");

    expect(result.type).toBe("movie");
    expect(result.periodWatches).toBe(1);
    expect(result.movieWatches).toBe(1);
    expect(result.showWatches).toBe(0);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { type: "movie" },
        }),
      }),
    );
  });

  it("returns empty peaks when there are no watches", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    const result = await service.insights("user-1", "week");

    expect(result.periodWatches).toBe(0);
    expect(result.peakHour).toBeNull();
    expect(result.peakDow).toBeNull();
    expect(result.topGenre).toBeNull();
    expect(result.newTitles).toBe(0);
    expect(result.compare.deltaPct).toBe(0);
  });
});
