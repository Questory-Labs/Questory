import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayingNowService } from "../../src/music/playing-now/playing-now.service";
import type { CacheService } from "../../src/cache/cache.service";
import type { CatalogService } from "../../src/music/catalog/catalog.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";
import type { EnrichmentService } from "../../src/music/enrichment/enrichment.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("PlayingNowService merge remap", () => {
  const cacheGetJson = vi.fn();
  const cacheSetJson = vi.fn();
  const trackFindUnique = vi.fn();
  const playingNowUpdateMany = vi.fn();
  const resolvePlaybackTrackId = vi.fn();

  let service: PlayingNowService;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheGetJson.mockResolvedValue({
      updatedAt: "2024-06-01T12:00:00.000Z",
      track: {
        id: "t-source",
        title: "Old Song",
        artistId: "b1",
        artistName: "Artist B",
        releaseId: null,
        releaseTitle: null,
        imageUrl: null,
      },
    });
    resolvePlaybackTrackId.mockResolvedValue("t-target");
    trackFindUnique.mockResolvedValue({
      id: "t-target",
      title: "Song",
      artist: { id: "a1", name: "Artist A" },
      release: { id: "r1", title: "Album A", imageUrl: "https://img" },
    });

    const prisma = {
      track: { findUnique: trackFindUnique },
      playingNow: {
        findUnique: vi.fn(),
        updateMany: playingNowUpdateMany,
      },
    } as unknown as PrismaService;

    const cache = {
      getJson: cacheGetJson,
      setJson: cacheSetJson,
      del: vi.fn(),
    } as unknown as CacheService;

    const corrections = {
      resolvePlaybackTrackId,
    } as unknown as CorrectionsService;

    service = new PlayingNowService(
      prisma,
      cache,
      {} as CatalogService,
      {} as EnrichmentService,
      corrections,
    );
  });

  it("remaps cached now-playing through merge rules on read", async () => {
    const snapshot = await service.getSnapshot("user1");

    expect(resolvePlaybackTrackId).toHaveBeenCalledWith("user1", "t-source");
    expect(snapshot?.track.id).toBe("t-target");
    expect(snapshot?.track.title).toBe("Song");
    expect(cacheSetJson).toHaveBeenCalled();
    expect(playingNowUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user1", trackId: "t-source" },
      data: { trackId: "t-target", updatedAt: expect.any(Date) },
    });
  });
});
