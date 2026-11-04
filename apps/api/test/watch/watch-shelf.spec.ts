import { describe, expect, it, vi } from "vitest";
import {
  continueWatching,
  eventMinutes,
  nextEpisodeAfter,
  progressPercent,
  sortTopTitles,
  titleWatchExtras,
} from "../../src/watch/analytics/watch-shelf";
import { isDroppedListStatus } from "../../src/watch/catalog/list-status";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("watch shelf helpers", () => {
  it("resolves event minutes through the runtime fallbacks", () => {
    expect(eventMinutes({ runtimeMinutes: 30 })).toBe(30);
    expect(
      eventMinutes({ runtimeMinutes: null, episode: { runtimeMinutes: 22 } }),
    ).toBe(22);
    expect(eventMinutes({ title: { runtimeMinutes: 100 } })).toBe(100);
    expect(eventMinutes({ runtimeMinutes: 0 })).toBe(0);
  });

  it("sorts tops by count or minutes", () => {
    const items = [
      { id: "a", count: 5, minutes: 50 },
      { id: "b", count: 2, minutes: 200 },
    ];
    expect(sortTopTitles([...items]).map((i) => i.id)).toEqual(["a", "b"]);
    expect(sortTopTitles([...items], "minutes").map((i) => i.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("finds the next episode from the ingested list or guesses", () => {
    const list = [
      { seasonNumber: 0, episodeNumber: 1, name: "Special" },
      { seasonNumber: 1, episodeNumber: 1, name: "One" },
      { seasonNumber: 1, episodeNumber: 2, name: "Two" },
      { seasonNumber: 2, episodeNumber: 1, name: "S2" },
    ];
    expect(
      nextEpisodeAfter({ seasonNumber: 1, episodeNumber: 2 }, list, 2, null),
    ).toEqual({ seasonNumber: 2, episodeNumber: 1, name: "S2" });
    expect(
      nextEpisodeAfter({ seasonNumber: 2, episodeNumber: 1 }, list, 3, null),
    ).toBeNull();
    expect(
      nextEpisodeAfter({ seasonNumber: 1, episodeNumber: 4 }, [], 4, null),
    ).toEqual({ seasonNumber: 1, episodeNumber: 5, name: null });
    expect(
      nextEpisodeAfter({ seasonNumber: 1, episodeNumber: 12 }, [], 12, 12),
    ).toBeNull();
  });

  it("computes progress only when totals are known", () => {
    expect(progressPercent(6, 12)).toBe(50);
    expect(progressPercent(6, null)).toBeNull();
    expect(progressPercent(20, 12)).toBe(100);
  });

  it("detects dropped list statuses", () => {
    expect(isDroppedListStatus("DROPPED")).toBe(true);
    expect(isDroppedListStatus("dropped")).toBe(true);
    expect(isDroppedListStatus("completed")).toBe(false);
    expect(isDroppedListStatus(null)).toBe(false);
  });
});

describe("titleWatchExtras", () => {
  it("groups watched episodes by season and merges the ingested list", async () => {
    const prisma = {
      watchEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            watchedAt: new Date("2026-10-02T00:00:00Z"),
            runtimeMinutes: null,
            episode: {
              seasonNumber: 1,
              episodeNumber: 2,
              runtimeMinutes: 25,
              name: "Two",
              airDate: null,
            },
          },
          {
            watchedAt: new Date("2026-10-01T00:00:00Z"),
            runtimeMinutes: null,
            episode: {
              seasonNumber: 1,
              episodeNumber: 1,
              runtimeMinutes: null,
              name: "One",
              airDate: null,
            },
          },
          {
            watchedAt: new Date("2026-09-01T00:00:00Z"),
            runtimeMinutes: null,
            episode: {
              seasonNumber: 1,
              episodeNumber: 1,
              runtimeMinutes: null,
              name: "One",
              airDate: null,
            },
          },
        ]),
      },
      season: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { seasonNumber: 1, name: "Season 1", episodeCount: 3 },
          ]),
      },
      episode: {
        findMany: vi.fn().mockResolvedValue([
          {
            seasonNumber: 1,
            episodeNumber: 1,
            name: "One",
            airDate: null,
            runtimeMinutes: 24,
          },
          {
            seasonNumber: 1,
            episodeNumber: 2,
            name: "Two",
            airDate: null,
            runtimeMinutes: 25,
          },
          {
            seasonNumber: 1,
            episodeNumber: 3,
            name: "Three",
            airDate: new Date("2026-11-01T00:00:00Z"),
            runtimeMinutes: 24,
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await titleWatchExtras(prisma, "u-1", {
      id: "t-1",
      type: "show",
      runtimeMinutes: 20,
    });

    expect(result.totalMinutesWatched).toBe(25 + 20 + 20);
    expect(result.distinctEpisodesWatched).toBe(2);
    expect(result.seasons).toHaveLength(1);
    expect(result.seasons[0]).toMatchObject({
      seasonNumber: 1,
      episodeCount: 3,
      watchedEpisodes: 2,
    });
    expect(result.seasons[0].episodes.map((e) => e.watchCount)).toEqual([
      2, 1, 0,
    ]);
    expect(result.seasons[0].episodes[2].airDate).toBe(
      "2026-11-01T00:00:00.000Z",
    );
  });

  it("skips season queries for movies", async () => {
    const seasonFind = vi.fn();
    const prisma = {
      watchEvent: { findMany: vi.fn().mockResolvedValue([]) },
      season: { findMany: seasonFind },
      episode: { findMany: seasonFind },
    } as unknown as PrismaService;
    const result = await titleWatchExtras(prisma, "u-1", {
      id: "m-1",
      type: "movie",
      runtimeMinutes: 90,
    });
    expect(result).toEqual({
      totalMinutesWatched: 0,
      distinctEpisodesWatched: 0,
      seasons: [],
    });
    expect(seasonFind).not.toHaveBeenCalled();
  });
});

describe("continueWatching", () => {
  it("returns recent shows with the next episode and progress", async () => {
    const eventFind = vi
      .fn()
      .mockResolvedValueOnce([
        {
          titleId: "t-1",
          watchedAt: new Date("2026-10-20T00:00:00Z"),
          episode: { seasonNumber: 1, episodeNumber: 3 },
        },
        {
          titleId: "t-2",
          watchedAt: new Date("2026-10-19T00:00:00Z"),
          episode: { seasonNumber: 1, episodeNumber: 12 },
        },
        {
          titleId: "t-1",
          watchedAt: new Date("2026-10-18T00:00:00Z"),
          episode: { seasonNumber: 1, episodeNumber: 2 },
        },
      ])
      .mockResolvedValueOnce([
        { titleId: "t-1" },
        { titleId: "t-1" },
        { titleId: "t-2" },
      ]);
    const prisma = {
      watchEvent: { findMany: eventFind },
      title: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "t-1",
            name: "Show",
            displayName: null,
            posterUrl: null,
            backdropUrl: "b",
            totalEpisodes: 10,
            anilistId: 5,
            malId: null,
          },
          {
            id: "t-2",
            name: "Done",
            displayName: null,
            posterUrl: null,
            backdropUrl: null,
            totalEpisodes: 12,
            anilistId: null,
            malId: null,
          },
        ]),
      },
      episode: {
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          if (!where.OR) return { id: "ep" };
          return where.titleId === "t-1"
            ? { seasonNumber: 1, episodeNumber: 4, name: "Four" }
            : null;
        }),
      },
    } as unknown as PrismaService;

    const result = await continueWatching(
      prisma,
      "u-1",
      8,
      Date.parse("2026-10-27T00:00:00Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: { id: "t-1", name: "Show", backdropUrl: "b" },
      anime: true,
      last: { seasonNumber: 1, episodeNumber: 3 },
      next: { seasonNumber: 1, episodeNumber: 4, name: "Four" },
      watchedEpisodes: 2,
      progress: 20,
    });
    expect(eventFind.mock.calls[0][0]).toMatchObject({
      take: expect.any(Number),
    });
  });

  it("returns nothing when there are no recent episode events", async () => {
    const prisma = {
      watchEvent: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    expect(await continueWatching(prisma, "u-1", 8)).toEqual({ items: [] });
  });

  describe("next episode lookup", () => {
    const NOW = Date.parse("2026-10-28T00:00:00Z");
    const prismaWith = (findFirst: ReturnType<typeof vi.fn>) =>
      ({
        watchEvent: {
          findMany: vi
            .fn()
            .mockResolvedValueOnce([
              {
                titleId: "show",
                watchedAt: new Date(NOW - 86_400_000),
                episode: { seasonNumber: 12, episodeNumber: 3 },
              },
            ])
            .mockResolvedValueOnce([{ titleId: "show" }]),
        },
        title: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "show",
              name: "Show",
              displayName: null,
              posterUrl: null,
              backdropUrl: null,
              totalEpisodes: 300,
              anilistId: null,
              malId: null,
            },
          ]),
        },
        episode: { findFirst },
      }) as unknown as PrismaService;

    it("finds the next aired episode per title without a shared row cap", async () => {
      const findFirst = vi
        .fn()
        .mockResolvedValue({ seasonNumber: 12, episodeNumber: 4, name: "Next" });
      const out = await continueWatching(prismaWith(findFirst), "u1", 5, NOW);
      expect(out.items[0]?.next).toEqual({
        seasonNumber: 12,
        episodeNumber: 4,
        name: "Next",
      });
      expect(findFirst.mock.calls[0]![0].where).toMatchObject({
        titleId: "show",
        AND: [{ OR: [{ airDate: null }, { airDate: { lte: new Date(NOW) } }] }],
      });
    });

    it("skips a show whose remaining episodes have not aired", async () => {
      const findFirst = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "ep" });
      const out = await continueWatching(prismaWith(findFirst), "u1", 5, NOW);
      expect(out.items).toEqual([]);
    });

    it("guesses the next episode when no episode list is stored", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const out = await continueWatching(prismaWith(findFirst), "u1", 5, NOW);
      expect(out.items[0]?.next).toEqual({
        seasonNumber: 12,
        episodeNumber: 4,
        name: null,
      });
    });
  });
});
