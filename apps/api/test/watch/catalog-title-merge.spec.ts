import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/watch/catalog/catalog.service";
import { absorbTitle, claimTmdbId } from "../../src/watch/catalog/title-merge";
import type { PrismaService } from "../../src/prisma/prisma.service";

function titleRow(overrides: Record<string, unknown>) {
  return {
    name: "Heat",
    nameNormalized: "heat",
    year: 1995,
    overview: null,
    runtimeMinutes: null,
    posterUrl: null,
    imageManual: false,
    traktId: null,
    tmdbId: null,
    imdbId: null,
    anilistId: null,
    malId: null,
    kitsuId: null,
    bangumiId: null,
    shikimoriId: null,
    ...overrides,
  };
}

describe("CatalogService.upsertTitle name merge", () => {
  const findUnique = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const update = vi.fn();
  const create = vi.fn();
  let service: CatalogService;

  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    update.mockReset();
    create.mockReset();
    const prisma = {
      title: { findUnique, findFirst, findMany, update, create },
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it("merges AniList sync into a manual TMDB title with a longer name", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(null);
    findMany.mockResolvedValue([
      titleRow({
        id: "manual-1",
        type: "show",
        name: "Frieren: Beyond Journey's End",
        nameNormalized: "frieren beyond journeys end",
        year: 2023,
        tmdbId: 209867,
      }),
    ]);
    update.mockResolvedValue({ id: "manual-1" });

    await service.upsertTitle({
      type: "show",
      name: "Frieren",
      year: 2023,
      anilistId: 154587,
    });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "manual-1" },
        data: expect.objectContaining({
          anilistId: 154587,
          tmdbId: 209867,
          name: "Frieren: Beyond Journey's End",
        }),
      }),
    );
  });
});

describe("absorbTitle", () => {
  it("moves watch events onto the TMDB row and copies AniList ids", async () => {
    const keep = titleRow({
      id: "tmdb-row",
      type: "movie",
      tmdbId: 949,
    });
    const drop = titleRow({
      id: "anilist-row",
      type: "movie",
      anilistId: 10,
      malId: 21,
    });

    const titleUpdate = vi.fn().mockResolvedValue({});
    const titleDelete = vi.fn().mockResolvedValue({});
    const titleFindUnique = vi
      .fn()
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(drop)
      .mockResolvedValue(keep);
    const prisma = {
      title: {
        findUnique: titleFindUnique,
        findUniqueOrThrow: vi.fn().mockResolvedValue({ ...keep, anilistId: 10 }),
        update: titleUpdate,
        delete: titleDelete,
      },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      season: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      watchEvent: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      titleListState: { findMany: vi.fn().mockResolvedValue([]) },
      titleGenre: { findMany: vi.fn().mockResolvedValue([]) },
      titleEnrichmentJob: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaService;

    await absorbTitle(prisma, "tmdb-row", "anilist-row");

    expect(prisma.watchEvent.updateMany).toHaveBeenCalledWith({
      where: { titleId: "anilist-row" },
      data: { titleId: "tmdb-row" },
    });
    expect(titleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tmdb-row" },
        data: expect.objectContaining({
          tmdbId: 949,
          anilistId: 10,
          malId: 21,
        }),
      }),
    );
    expect(titleDelete).toHaveBeenCalledWith({ where: { id: "anilist-row" } });
  });
});

describe("claimTmdbId", () => {
  it("is a no-op when this title already owns the tmdbId", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "clone" });
    const prisma = { title: { findUnique } } as unknown as PrismaService;

    await expect(claimTmdbId(prisma, "clone", "movie", 949)).resolves.toBe(
      "clone",
    );
  });
});
