import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/music/catalog/catalog.service";
import type { CorrectionsService } from "../../src/music/corrections/corrections.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("CatalogService scrobble corrections", () => {
  const applyRulesToMeta = vi.fn();
  const listenFindUnique = vi.fn();
  const listenCreate = vi.fn();
  const listenUpdate = vi.fn();
  const listenHourBucketUpsert = vi.fn();
  const trackFindUnique = vi.fn();
  const resolveCorrectedTrack = vi.fn();

  let service: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    applyRulesToMeta.mockImplementation(async (_userId, meta) => meta);

    const prisma = {
      listen: {
        findUnique: listenFindUnique,
        create: listenCreate,
        update: listenUpdate,
      },
      listenHourBucket: { upsert: listenHourBucketUpsert },
      track: { findUnique: trackFindUnique },
      artist: {
        findFirst: vi.fn().mockResolvedValue({ id: "a1" }),
        create: vi.fn(),
        update: vi.fn(),
      },
      release: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "r1" }),
        update: vi.fn(),
      },
      trackArtist: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      trackGenre: { upsert: vi.fn() },
      genre: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    } as unknown as PrismaService;

    const corrections = {
      applyRulesToMeta,
    } as unknown as CorrectionsService;

    service = new CatalogService(prisma, corrections);
    vi.spyOn(service, "resolveCorrectedTrack").mockImplementation(
      resolveCorrectedTrack,
    );
  });

  it("applies user rules before persisting a scrobble", async () => {
    applyRulesToMeta.mockResolvedValue({
      artistName: "Artist A",
      trackName: "Corrected Song",
      releaseName: "Album A",
      listenedAt: new Date("2024-06-01T12:00:00Z"),
      listenType: "single",
      correctionArtistIds: ["a1"],
      correctionTargetTrackId: "t-corrected",
    });
    trackFindUnique.mockResolvedValue({
      id: "t-corrected",
      artist: { id: "a1", name: "Artist A" },
      release: { id: "r1", title: "Album A" },
    });
    listenFindUnique.mockResolvedValue(null);
    listenCreate.mockResolvedValue({ id: "l1" });

    const result = await service.upsertListen("user1", {
      artistName: "Artist B",
      trackName: "Wrong Song",
      releaseName: "Wrong Album",
      listenedAt: new Date("2024-06-01T12:00:00Z"),
      listenType: "single",
    });

    expect(applyRulesToMeta).toHaveBeenCalledTimes(1);
    expect(resolveCorrectedTrack).not.toHaveBeenCalled();
    expect(listenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trackId: "t-corrected" }),
      }),
    );
    expect(result.track.id).toBe("t-corrected");
  });

  it("uses target album id when resolving corrected tracks", async () => {
    applyRulesToMeta.mockResolvedValue({
      artistName: "Artist A",
      trackName: "Song",
      releaseName: "Album A",
      listenedAt: new Date("2024-06-01T12:00:00Z"),
      listenType: "single",
      correctionArtistIds: ["a1"],
      correctionTargetAlbumId: "r-target",
    });
    resolveCorrectedTrack.mockResolvedValue({ id: "t2", releaseId: "r-target" });
    trackFindUnique.mockResolvedValue({
      id: "t2",
      artist: { id: "a1", name: "Artist A" },
      release: { id: "r-target", title: "Album A" },
    });
    listenFindUnique.mockResolvedValue(null);
    listenCreate.mockResolvedValue({ id: "l1" });

    await service.upsertListen("user1", {
      artistName: "Artist B",
      trackName: "Song",
      releaseName: "Old Album",
      listenedAt: new Date("2024-06-01T12:00:00Z"),
      listenType: "single",
    });

    expect(resolveCorrectedTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        artistIds: ["a1"],
        albumId: "r-target",
      }),
    );
  });
});
