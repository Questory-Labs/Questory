import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("Watch CatalogService metadata", () => {
  const titleFindUnique = vi.fn();
  const titleUpdate = vi.fn();
  let service: CatalogService;

  beforeEach(() => {
    titleFindUnique.mockReset();
    titleUpdate.mockReset();
    const prisma = {
      title: { findUnique: titleFindUnique, update: titleUpdate },
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it("locks poster when manually set", async () => {
    titleFindUnique.mockResolvedValue({
      id: "t1",
      posterUrl: null,
      imageManual: false,
    });
    titleUpdate.mockResolvedValue({ id: "t1" });

    await service.updateTitle("t1", {
      posterUrl: "https://example.com/poster.jpg",
    });

    expect(titleUpdate).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        posterUrl: "https://example.com/poster.jpg",
        imageManual: true,
      },
    });
  });
});

describe("Watch CatalogService.upsertTitle poster guard", () => {
  const titleFindUnique = vi.fn();
  const titleFindFirst = vi.fn();
  const titleUpdate = vi.fn();
  let service: CatalogService;

  beforeEach(() => {
    titleFindUnique.mockReset();
    titleFindFirst.mockReset();
    titleUpdate.mockReset();
    const prisma = {
      title: {
        findUnique: titleFindUnique,
        findFirst: titleFindFirst,
        update: titleUpdate,
        create: vi.fn(),
      },
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it("does not overwrite manual poster on upsert", async () => {
    titleFindUnique.mockResolvedValue({
      id: "t1",
      type: "movie",
      name: "Old",
      nameNormalized: "old",
      year: 2020,
      overview: null,
      runtimeMinutes: null,
      posterUrl: "https://manual.jpg",
      imageManual: true,
      traktId: null,
      tmdbId: 99,
      imdbId: null,
      anilistId: null,
      malId: null,
    });
    titleUpdate.mockResolvedValue({ id: "t1" });

    await service.upsertTitle({
      type: "movie",
      name: "New Title",
      tmdbId: 99,
      posterUrl: "https://sync.jpg",
    });

    expect(titleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          posterUrl: "https://manual.jpg",
        }),
      }),
    );
  });
});
