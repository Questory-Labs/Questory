import { describe, expect, it, vi } from "vitest";
import { suggestCatalog } from "../../src/music/corrections/catalog-suggest";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("suggestCatalog", () => {
  it("returns an existing listened artist instead of create-only", async () => {
    const artistFindMany = vi.fn().mockResolvedValue([
      { id: "a1", name: "Laufey" },
    ]);
    const prisma = {
      artist: { findMany: artistFindMany },
    } as unknown as PrismaService;

    const result = await suggestCatalog(prisma, "user1", "artist", "laufey");

    expect(result.items).toEqual([{ id: "a1", name: "Laufey" }]);
    const listens = { some: { userId: "user1" } };
    expect(artistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nameNormalized: { contains: "laufey" },
          OR: [
            { tracks: { some: { listens } } },
            { trackFeatures: { some: { track: { listens } } } },
          ],
        }),
      }),
    );
  });

  it("includes featured-only artists in the listen scope", async () => {
    const artistFindMany = vi.fn().mockResolvedValue([
      { id: "feat-1", name: "Laufey" },
    ]);
    const prisma = {
      artist: { findMany: artistFindMany },
    } as unknown as PrismaService;

    await suggestCatalog(prisma, "user1", "artist", "Laufey");

    const where = artistFindMany.mock.calls[0][0].where as {
      OR: unknown[];
    };
    expect(where.OR).toEqual(
      expect.arrayContaining([
        {
          trackFeatures: {
            some: { track: { listens: { some: { userId: "user1" } } } },
          },
        },
      ]),
    );
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { tracks: { some: { listens: { some: { userId: "user1" } } } } },
      ]),
    );
  });

  it("offers create when no existing artist matches the query", async () => {
    const prisma = {
      artist: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const result = await suggestCatalog(prisma, "user1", "artist", "laufey");

    expect(result.items).toEqual([{ name: "laufey", isNew: true }]);
  });

  it("keeps a partial create option alongside substring matches", async () => {
    const prisma = {
      artist: {
        findMany: vi.fn().mockResolvedValue([{ id: "a1", name: "Laufey" }]),
      },
    } as unknown as PrismaService;

    const result = await suggestCatalog(prisma, "user1", "artist", "lauf");

    expect(result.items).toEqual([
      { name: "lauf", isNew: true },
      { id: "a1", name: "Laufey" },
    ]);
  });

  it("caps create-option results at take when 25 matches lack an exact name", async () => {
    const prisma = {
      artist: {
        findMany: vi.fn().mockResolvedValue(
          Array.from({ length: 25 }, (_, i) => ({
            id: `a${i}`,
            name: `Artist ${i}`,
          })),
        ),
      },
    } as unknown as PrismaService;

    const result = await suggestCatalog(
      prisma,
      "user1",
      "artist",
      "query",
      25,
    );

    expect(result.items).toHaveLength(25);
    expect(result.items[0]).toEqual({ name: "query", isNew: true });
    expect(result.items.some((item) => item.id === "a24")).toBe(false);
  });

  it("queries albums by title instead of sampling listens", async () => {
    const releaseFindMany = vi.fn().mockResolvedValue([
      { id: "r1", title: "Bewitched" },
    ]);
    const prisma = {
      release: { findMany: releaseFindMany },
    } as unknown as PrismaService;

    const result = await suggestCatalog(prisma, "user1", "album", "bewitched");

    expect(result.items).toEqual([{ id: "r1", name: "Bewitched" }]);
    expect(releaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          titleNormalized: { contains: "bewitched" },
        }),
      }),
    );
  });
});
