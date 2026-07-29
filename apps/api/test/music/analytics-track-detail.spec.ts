import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/music/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/music/users/users.service";
import type { PlayingNowService } from "../../src/music/playing-now/playing-now.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";

describe("AnalyticsService.trackDetail", () => {
  const findUnique = vi.fn();
  const count = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findById = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    findById.mockReset().mockResolvedValue({ id: "user-1" });

    const prisma = {
      track: { findUnique },
      listen: { count, findFirst, findMany },
    } as unknown as PrismaService;
    const users = { findById: findById } as unknown as UsersService;
    const playingNow = {} as PlayingNowService;
    const corrections = {
      resolveDisplayName: vi
        .fn()
        .mockImplementation(
          async (_u, kind, _id, canonical: string) => canonical,
        ),
      loadLabelsForUser: vi.fn().mockResolvedValue(new Map()),
    } as unknown as CorrectionsService;
    service = new AnalyticsService(prisma, users, playingNow, corrections);
  });

  it("returns range-scoped stats and metadata", async () => {
    findUnique.mockResolvedValue({
      id: "tr-1",
      title: "Blueming",
      displayName: null,
      recordingMbid: null,
      spotifyId: null,
      durationMs: 180_000,
      artist: { id: "artist-1", name: "IU", displayName: null },
      release: {
        id: "rel-1",
        title: "Palette",
        displayName: null,
        imageUrl: "https://example.com/palette.jpg",
        imageManual: false,
      },
      genres: [{ genre: { name: "k-pop", kind: "genre" }, source: "mb" }],
      featuredArtists: [],
    });
    count.mockResolvedValue(3);
    findFirst
      .mockResolvedValueOnce({ listenedAt: new Date("2024-01-01T10:00:00Z") })
      .mockResolvedValueOnce({ listenedAt: new Date("2026-01-01T18:00:00Z") });
    findMany.mockResolvedValue([
      {
        listenedAt: new Date("2026-01-06T09:00:00Z"),
        musicService: "spotify",
      },
      {
        listenedAt: new Date("2026-01-06T10:00:00Z"),
        musicService: "spotify",
      },
      {
        listenedAt: new Date("2026-01-07T09:00:00Z"),
        musicService: "youtube music",
      },
    ]);

    const result = await service.trackDetail(
      "user-1",
      "tr-1",
      "month",
      "UTC",
    );

    expect(result.range).toBe("month");
    expect(result.listenCount).toBe(3);
    expect(result.listeningMinutes).toBe(9);
    expect(result.uniqueDays).toBe(2);
    expect(result.topService).toEqual({ name: "spotify", count: 2 });
    expect(result.peakHour).not.toBeNull();
    expect(result.peakDow).not.toBeNull();
    expect(result.track.releaseTitle).toBe("Palette");
  });
});
