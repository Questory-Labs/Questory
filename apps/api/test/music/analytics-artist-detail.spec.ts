import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/music/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/music/users/users.service";
import type { PlayingNowService } from "../../src/music/playing-now/playing-now.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";

describe("AnalyticsService.artistDetail", () => {
  const findUnique = vi.fn();
  const count = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findById = vi.fn();
  const loadLabelsForUser = vi.fn();
  const resolveDisplayName = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    findById.mockReset().mockResolvedValue({ id: "user-1" });
    loadLabelsForUser.mockReset().mockResolvedValue(new Map());
    resolveDisplayName.mockReset().mockImplementation(
      async (_u, _k, _id, canonical: string) => canonical,
    );

    const prisma = {
      artist: { findUnique },
      listen: { count, findFirst, findMany },
    } as unknown as PrismaService;
    const users = { findById: findById } as unknown as UsersService;
    const playingNow = {} as PlayingNowService;
    const corrections = {
      loadLabelsForUser,
      resolveDisplayName,
    } as unknown as CorrectionsService;
    service = new AnalyticsService(prisma, users, playingNow, corrections);
  });

  it("returns range-scoped tops and display metadata", async () => {
    resolveDisplayName.mockResolvedValue("My IU");
    findUnique.mockResolvedValue({
      id: "artist-1",
      name: "IU",
      displayName: "My IU",
      mbid: null,
      imageUrl: null,
      imageManual: false,
      genres: [{ genre: { name: "k-pop" } }],
    });
    count.mockResolvedValue(3);
    findFirst
      .mockResolvedValueOnce({ listenedAt: new Date("2024-01-01") })
      .mockResolvedValueOnce({ listenedAt: new Date("2026-01-01") });
    findMany.mockResolvedValueOnce([
      {
        listenedAt: new Date("2026-01-05T22:10:00.000Z"),
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          durationMs: 240_000,
          releaseId: "rel-1",
          release: {
            id: "rel-1",
            title: "Palette",
            displayName: null,
            imageUrl: "https://example.com/palette.jpg",
            year: 2017,
          },
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        listenedAt: new Date("2026-01-05T22:40:00.000Z"),
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          durationMs: 240_000,
          releaseId: "rel-1",
          release: {
            id: "rel-1",
            title: "Palette",
            displayName: null,
            imageUrl: "https://example.com/palette.jpg",
            year: 2017,
          },
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        listenedAt: new Date("2026-01-06T09:00:00.000Z"),
        track: {
          id: "tr-2",
          title: "Love poem",
          displayName: null,
          durationMs: null,
          releaseId: "rel-2",
          release: {
            id: "rel-2",
            title: "Love poem",
            displayName: null,
            imageUrl: null,
            year: 2019,
          },
          genres: [],
        },
      },
    ]);
    findMany.mockResolvedValueOnce([
      {
        track: {
          artist: { id: "artist-2", name: "BTS", imageUrl: null },
          featuredArtists: [],
        },
      },
      {
        track: {
          artist: { id: "artist-2", name: "BTS", imageUrl: null },
          featuredArtists: [
            { artist: { id: "artist-1", name: "IU", imageUrl: null } },
          ],
        },
      },
      {
        track: {
          artist: { id: "artist-2", name: "BTS", imageUrl: null },
          featuredArtists: [],
        },
      },
    ]);

    const result = await service.artistDetail(
      "user-1",
      "artist-1",
      "month",
      "UTC",
    );

    expect(result.range).toBe("month");
    expect(result.artist.userDisplayName).toBe("My IU");
    expect(result.artist.imageUrl).toBe("https://example.com/palette.jpg");
    expect(result.topTracks[0]?.count).toBe(2);
    expect(result.topAlbums[0]?.title).toBe("Palette");
    expect(result.topAlbums[0]?.year).toBe(2017);
    expect(result.listeningMinutes).toBe(8);
    expect(result.peakHour).toEqual({ hour: 22, label: "10pm", count: 2 });
    expect(result.peakDow?.label).toBe("Mon");
    expect(result.rank).toBe(2);
    expect(result.topMoods[0]).toEqual({
      id: "m1",
      name: "chill",
      count: 2,
    });
  });

  it("returns artist listens bucketed by hour of day", async () => {
    findUnique.mockResolvedValue({ id: "artist-1" });
    findMany.mockResolvedValue([
      { listenedAt: new Date("2026-01-05T22:10:00.000Z") },
      { listenedAt: new Date("2026-01-06T22:40:00.000Z") },
    ]);

    const buckets = await service.artistTimeSeries(
      "user-1",
      "artist-1",
      "hourOfDay",
      "all",
      "UTC",
    );

    expect(buckets).toHaveLength(24);
    expect(buckets[22]).toEqual({ key: "22", label: "10pm", count: 2 });
    expect(findMany.mock.calls[0]?.[0]?.where).toEqual({
      userId: "user-1",
      track: {
        OR: [
          { artistId: "artist-1" },
          { featuredArtists: { some: { artistId: "artist-1" } } },
        ],
      },
    });
  });

  it("404s an unknown artist time series", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.artistTimeSeries("user-1", "missing", "dayOfWeek"),
    ).rejects.toThrow("Artist not found");
  });
});
