import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadCatalogService } from "../../src/read/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("ReadCatalogService metadata", () => {
  const readTitleFindUnique = vi.fn();
  const readTitleUpdate = vi.fn();
  let service: ReadCatalogService;

  beforeEach(() => {
    readTitleFindUnique.mockReset();
    readTitleUpdate.mockReset();
    const prisma = {
      readTitle: {
        findUnique: readTitleFindUnique,
        update: readTitleUpdate,
      },
    } as unknown as PrismaService;
    service = new ReadCatalogService(prisma);
  });

  it("locks cover when manually set", async () => {
    readTitleFindUnique.mockResolvedValue({
      id: "rt1",
      coverUrl: null,
      imageManual: false,
    });
    readTitleUpdate.mockResolvedValue({ id: "rt1" });

    await service.updateTitle("rt1", {
      coverUrl: "https://example.com/cover.jpg",
    });

    expect(readTitleUpdate).toHaveBeenCalledWith({
      where: { id: "rt1" },
      data: {
        coverUrl: "https://example.com/cover.jpg",
        imageManual: true,
      },
    });
  });
});

describe("ReadCatalogService.upsertTitle cover guard", () => {
  const readTitleFindUnique = vi.fn();
  const readTitleUpdate = vi.fn();
  let service: ReadCatalogService;

  beforeEach(() => {
    readTitleFindUnique.mockReset();
    readTitleUpdate.mockReset();
    const prisma = {
      readTitle: {
        findUnique: readTitleFindUnique,
        findFirst: vi.fn(),
        update: readTitleUpdate,
        create: vi.fn(),
      },
    } as unknown as PrismaService;
    service = new ReadCatalogService(prisma);
  });

  it("does not overwrite manual cover on upsert", async () => {
    readTitleFindUnique.mockResolvedValue({
      id: "rt1",
      name: "Manga",
      nameNormalized: "manga",
      format: "manga",
      year: null,
      overview: null,
      chapters: null,
      volumes: null,
      coverUrl: "https://manual.jpg",
      imageManual: true,
      malId: null,
      countryOfOrigin: null,
      publishingStatus: null,
    });
    readTitleUpdate.mockResolvedValue({ id: "rt1" });

    await service.upsertTitle({
      format: "manga",
      name: "Manga Renamed",
      anilistId: 42,
      coverUrl: "https://sync.jpg",
    });

    expect(readTitleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coverUrl: "https://manual.jpg",
        }),
      }),
    );
  });
});
