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
    findMany.mockResolvedValue([
      {
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          releaseId: "rel-1",
          release: {
            id: "rel-1",
            title: "Palette",
            displayName: null,
            imageUrl: "https://example.com/palette.jpg",
          },
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          releaseId: "rel-1",
          release: {
            id: "rel-1",
            title: "Palette",
            displayName: null,
            imageUrl: "https://example.com/palette.jpg",
          },
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        track: {
          id: "tr-2",
          title: "Love poem",
          displayName: null,
          releaseId: "rel-2",
          release: {
            id: "rel-2",
            title: "Love poem",
            displayName: null,
            imageUrl: null,
          },
          genres: [],
        },
      },
    ]);

    const result = await service.artistDetail("user-1", "artist-1", "month");

    expect(result.range).toBe("month");
    expect(result.artist.userDisplayName).toBe("My IU");
    expect(result.artist.imageUrl).toBe("https://example.com/palette.jpg");
    expect(result.topTracks[0]?.count).toBe(2);
    expect(result.topAlbums[0]?.title).toBe("Palette");
    expect(result.topMoods[0]).toEqual({
      id: "m1",
      name: "chill",
      count: 2,
    });
  });
});
