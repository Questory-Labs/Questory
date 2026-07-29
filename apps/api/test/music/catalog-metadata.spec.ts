import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/music/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("CatalogService metadata updates", () => {
  const artistFindUnique = vi.fn();
  const artistUpdate = vi.fn();
  const releaseFindUnique = vi.fn();
  const releaseUpdate = vi.fn();
  let service: CatalogService;

  beforeEach(() => {
    artistFindUnique.mockReset();
    artistUpdate.mockReset();
    releaseFindUnique.mockReset();
    releaseUpdate.mockReset();

    const prisma = {
      artist: { findUnique: artistFindUnique, update: artistUpdate },
      release: { findUnique: releaseFindUnique, update: releaseUpdate },
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it("sets imageManual when artist cover is saved", async () => {
    artistFindUnique.mockResolvedValue({
      id: "a1",
      displayName: null,
      imageUrl: null,
      imageManual: false,
    });
    artistUpdate.mockResolvedValue({ id: "a1" });

    await service.updateArtist("a1", {
      displayName: "Nickname",
      imageUrl: "https://example.com/cover.jpg",
    });

    expect(artistUpdate).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        displayName: "Nickname",
        imageUrl: "https://example.com/cover.jpg",
        imageManual: true,
      },
    });
  });

  it("clears imageManual when album cover is cleared", async () => {
    releaseFindUnique.mockResolvedValue({
      id: "r1",
      displayName: null,
      imageUrl: "https://example.com/old.jpg",
      imageManual: true,
    });
    releaseUpdate.mockResolvedValue({ id: "r1" });

    await service.updateAlbum("r1", { imageUrl: "" });

    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        imageUrl: null,
        imageManual: false,
      },
    });
  });
});
