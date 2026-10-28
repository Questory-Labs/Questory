import { describe, expect, it, vi } from "vitest";
import { TrendingService } from "../../src/trending/trending.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CacheService } from "../../src/cache/cache.service";
import type { SteamApiService } from "../../src/steam/steam-api.service";

describe("TrendingService.withLibraryFlags", () => {
  it("adds deck status and owned flag scoped to the caller", async () => {
    const gameFind = vi.fn().mockResolvedValue([
      { appId: 10, deckStatus: "verified" },
      { appId: 20, deckStatus: null },
    ]);
    const entryFind = vi.fn().mockResolvedValue([{ game: { appId: 20 } }]);
    const service = new TrendingService(
      {
        game: { findMany: gameFind },
        libraryEntry: { findMany: entryFind },
      } as unknown as PrismaService,
      {} as SteamApiService,
      {} as CacheService,
    );

    const shelf = await service.withLibraryFlags("u1", {
      games: [
        { appId: 10, name: "A", headerImage: null },
        { appId: 20, name: "B", headerImage: null },
        { appId: 30, name: "C", headerImage: null },
      ],
      meta: { source: "steam" },
    });

    expect(shelf.games.map((g) => [g.appId, g.deckStatus, g.owned])).toEqual([
      [10, "verified", false],
      [20, null, true],
      [30, null, false],
    ]);
    expect(entryFind.mock.calls[0]?.[0]?.where.userId).toBe("u1");
    expect(gameFind.mock.calls[0]?.[0]?.take).toBeGreaterThan(0);
  });

  it("skips lookups for an empty shelf", async () => {
    const gameFind = vi.fn();
    const service = new TrendingService(
      { game: { findMany: gameFind }, libraryEntry: { findMany: vi.fn() } } as unknown as PrismaService,
      {} as SteamApiService,
      {} as CacheService,
    );
    const shelf = await service.withLibraryFlags("u1", { games: [], meta: { source: "steam" } });
    expect(shelf.games).toEqual([]);
    expect(gameFind).not.toHaveBeenCalled();
  });
});
