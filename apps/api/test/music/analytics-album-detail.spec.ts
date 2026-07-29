import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/music/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/music/users/users.service";
import type { PlayingNowService } from "../../src/music/playing-now/playing-now.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";

describe("AnalyticsService.albumDetail", () => {
  const findUnique = vi.fn();
  const count = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findById = vi.fn();
  const resolveDisplayName = vi.fn();
  const loadLabelsForUser = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    findById.mockReset().mockResolvedValue({ id: "user-1" });
    resolveDisplayName.mockReset().mockResolvedValue("Palette");
    loadLabelsForUser.mockReset().mockResolvedValue(new Map());

    const prisma = {
      release: { findUnique },
      listen: { count, findFirst, findMany },
    } as unknown as PrismaService;
    const users = { findById: findById } as unknown as UsersService;
    const playingNow = {} as PlayingNowService;
    const corrections = {
      resolveDisplayName,
      loadLabelsForUser,
    } as unknown as CorrectionsService;
    service = new AnalyticsService(prisma, users, playingNow, corrections);
  });

  it("returns range-scoped stats and tops", async () => {
    findUnique.mockResolvedValue({
      id: "rel-1",
      title: "Palette",
      year: 2017,
      imageUrl: null,
      imageManual: false,
      mbid: null,
      artist: { id: "artist-1", name: "IU" },
    });
    count.mockResolvedValue(3);
    findFirst
      .mockResolvedValueOnce({ listenedAt: new Date("2024-01-01T10:00:00Z") })
      .mockResolvedValueOnce({ listenedAt: new Date("2026-01-07T09:00:00Z") });
    findMany.mockResolvedValue([
      {
        listenedAt: new Date("2026-01-06T09:00:00Z"),
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          durationMs: 180_000,
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        listenedAt: new Date("2026-01-06T10:00:00Z"),
        track: {
          id: "tr-1",
          title: "Blueming",
          displayName: null,
          durationMs: 180_000,
          genres: [{ genre: { id: "m1", name: "chill", kind: "mood" } }],
        },
      },
      {
        listenedAt: new Date("2026-01-07T09:00:00Z"),
        track: {
          id: "tr-2",
          title: "Palette",
          displayName: null,
          durationMs: 200_000,
          genres: [],
        },
      },
    ]);

    const result = await service.albumDetail(
      "user-1",
      "rel-1",
      "month",
      "UTC",
    );

    expect(result.range).toBe("month");
    expect(result.listenCount).toBe(3);
    expect(result.listeningMinutes).toBe(9);
    expect(result.peakHour).not.toBeNull();
    expect(result.peakDow).not.toBeNull();
    expect(result.topTracks[0]?.count).toBe(2);
    expect(result.topMoods[0]).toEqual({
      id: "m1",
      name: "chill",
      count: 2,
    });
  });
});
