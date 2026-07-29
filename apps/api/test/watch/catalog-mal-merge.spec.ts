import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("CatalogService.upsertTitle malId merge", () => {
  const findFirst = vi.fn();
  const update = vi.fn();
  let service: CatalogService;

  beforeEach(() => {
    findFirst.mockReset();
    update.mockReset();
    const prisma = {
      title: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst,
        update,
        create: vi.fn(),
      },
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it("merges MAL import into existing AniList row via malId", async () => {
    findFirst.mockResolvedValue({
      id: "t1",
      type: "show",
      name: "Show",
      nameNormalized: "show",
      year: 2020,
      overview: null,
      runtimeMinutes: null,
      posterUrl: null,
      imageManual: false,
      traktId: null,
      tmdbId: null,
      imdbId: null,
      anilistId: 99,
      malId: 42,
      kitsuId: null,
      bangumiId: null,
      shikimoriId: null,
    });
    update.mockResolvedValue({ id: "t1" });

    await service.upsertTitle({
      type: "show",
      name: "Show",
      malId: 42,
      shikimoriId: 7,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({
          malId: 42,
          shikimoriId: 7,
          anilistId: 99,
        }),
      }),
    );
  });
});
