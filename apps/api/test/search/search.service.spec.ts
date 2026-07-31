import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchService } from "../../src/search/search.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("SearchService", () => {
  const libraryEntryFindMany = vi.fn();
  const wishlistItemFindMany = vi.fn();
  const steamCatalogAppFindMany = vi.fn();
  const friendshipFindMany = vi.fn();
  const collectionFindMany = vi.fn();
  const artistFindMany = vi.fn();
  const releaseFindMany = vi.fn();
  const trackFindMany = vi.fn();
  const titleFindMany = vi.fn();
  const readListStateFindMany = vi.fn();
  const resolveUser = vi.fn();

  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    libraryEntryFindMany.mockResolvedValue([]);
    wishlistItemFindMany.mockResolvedValue([]);
    steamCatalogAppFindMany.mockResolvedValue([]);
    friendshipFindMany.mockResolvedValue([]);
    collectionFindMany.mockResolvedValue([]);
    artistFindMany.mockResolvedValue([]);
    releaseFindMany.mockResolvedValue([]);
    trackFindMany.mockResolvedValue([]);
    titleFindMany.mockResolvedValue([]);
    readListStateFindMany.mockResolvedValue([]);
    resolveUser.mockResolvedValue({ id: "user-1" });

    const prisma = {
      libraryEntry: { findMany: libraryEntryFindMany },
      wishlistItem: { findMany: wishlistItemFindMany },
      steamCatalogApp: { findMany: steamCatalogAppFindMany },
      friendship: { findMany: friendshipFindMany },
      collection: { findMany: collectionFindMany },
      artist: { findMany: artistFindMany },
      release: { findMany: releaseFindMany },
      track: { findMany: trackFindMany },
      title: { findMany: titleFindMany },
      readListState: { findMany: readListStateFindMany },
    } as unknown as PrismaService;

    const users = { resolveUser } as unknown as UsersService;
    service = new SearchService(prisma, users);
  });

  it("searches all domains by default", async () => {
    const result = await service.search("user-1", "portal", 10);

    expect(libraryEntryFindMany).toHaveBeenCalled();
    expect(friendshipFindMany).toHaveBeenCalled();
    expect(artistFindMany).toHaveBeenCalled();
    expect(releaseFindMany).toHaveBeenCalled();
    expect(trackFindMany).toHaveBeenCalled();
    expect(titleFindMany).toHaveBeenCalled();
    expect(readListStateFindMany).toHaveBeenCalled();
    expect(result.music).toEqual({ artists: [], albums: [], tracks: [] });
  });

  it("limits to game scope with db name filter", async () => {
    await service.search("user-1", "game:portal", 10);

    expect(libraryEntryFindMany).toHaveBeenCalled();
    const where = libraryEntryFindMany.mock.calls[0]?.[0]?.where;
    expect(where.game.name).toEqual({
      contains: "portal",
      mode: "insensitive",
    });
    expect(friendshipFindMany).not.toHaveBeenCalled();
    expect(artistFindMany).not.toHaveBeenCalled();
    expect(titleFindMany).not.toHaveBeenCalled();
  });

  it("limits to friend scope", async () => {
    friendshipFindMany.mockResolvedValue([
      {
        friendSteamId: "76561198000000000",
        personaName: "Gaben",
        avatarUrl: null,
        friendUserId: null,
      },
    ]);

    const result = await service.search("user-1", "friend:gaben", 10);

    expect(friendshipFindMany).toHaveBeenCalled();
    expect(friendshipFindMany.mock.calls[0]?.[0]?.where.personaName).toEqual({
      contains: "gaben",
      mode: "insensitive",
    });
    expect(libraryEntryFindMany).not.toHaveBeenCalled();
    expect(result.friends).toHaveLength(1);
  });

  it("limits to collection scope", async () => {
    collectionFindMany.mockResolvedValue([
      {
        id: "c1",
        name: "Backlog",
        type: "custom",
        ruleKey: null,
        description: null,
        _count: { items: 3 },
      },
    ]);

    const result = await service.search("user-1", "collection:backlog", 10);

    expect(collectionFindMany).toHaveBeenCalled();
    expect(libraryEntryFindMany).not.toHaveBeenCalled();
    expect(result.collections).toHaveLength(1);
  });

  it("searches artists by scoped query via artist table", async () => {
    artistFindMany.mockResolvedValue([{ id: "a1", name: "IU" }]);

    const result = await service.search("user-1", "artist:iu", 10);

    expect(artistFindMany).toHaveBeenCalled();
    expect(releaseFindMany).not.toHaveBeenCalled();
    expect(trackFindMany).not.toHaveBeenCalled();
    expect(artistFindMany.mock.calls[0]?.[0]?.where.nameNormalized).toEqual({
      contains: "iu",
    });
    expect(result.music.artists).toEqual([{ id: "a1", name: "IU" }]);
    expect(result.music.albums).toEqual([]);
    expect(result.music.tracks).toEqual([]);
  });

  it("searches albums by scoped query via release table", async () => {
    releaseFindMany.mockResolvedValue([
      { id: "r1", title: "LILAC", artist: { name: "IU" } },
    ]);

    const result = await service.search("user-1", "album:lilac", 10);

    expect(releaseFindMany).toHaveBeenCalled();
    expect(artistFindMany).not.toHaveBeenCalled();
    expect(trackFindMany).not.toHaveBeenCalled();
    expect(result.music.albums[0]?.name).toBe("LILAC");
  });

  it("searches tracks by scoped query via track table", async () => {
    trackFindMany.mockResolvedValue([
      {
        id: "t1",
        title: "Blueming",
        artist: { name: "IU" },
        release: { title: "Palette" },
      },
    ]);

    const result = await service.search("user-1", "track:blueming", 10);

    expect(trackFindMany).toHaveBeenCalled();
    expect(artistFindMany).not.toHaveBeenCalled();
    expect(releaseFindMany).not.toHaveBeenCalled();
    expect(result.music.tracks[0]?.name).toBe("Blueming");
  });

  it("searches all music kinds for music scope", async () => {
    await service.search("user-1", "music:iu", 10);

    expect(artistFindMany).toHaveBeenCalled();
    expect(releaseFindMany).toHaveBeenCalled();
    expect(trackFindMany).toHaveBeenCalled();
  });

  it("searches movies only for movie scope", async () => {
    await service.search("user-1", "movie:godfather", 5);

    expect(titleFindMany).toHaveBeenCalledTimes(1);
    const where = titleFindMany.mock.calls[0]?.[0]?.where;
    expect(where.type).toBe("movie");
    expect(libraryEntryFindMany).not.toHaveBeenCalled();
  });

  it("searches shows only for show scope", async () => {
    await service.search("user-1", "show:breaking", 5);

    expect(titleFindMany).toHaveBeenCalledTimes(1);
    expect(titleFindMany.mock.calls[0]?.[0]?.where.type).toBe("show");
  });

  it("searches both watch types for watch scope", async () => {
    await service.search("user-1", "watch:matrix", 5);

    expect(titleFindMany).toHaveBeenCalledTimes(2);
    expect(titleFindMany.mock.calls[0]?.[0]?.where.type).toBe("movie");
    expect(titleFindMany.mock.calls[1]?.[0]?.where.type).toBe("show");
  });

  it("applies watch date filter when within is set", async () => {
    await service.search("user-1", "movie:godfather within:<7d", 5);

    const where = titleFindMany.mock.calls[0]?.[0]?.where;
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          watchEvents: expect.objectContaining({
            some: expect.objectContaining({
              watchedAt: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          }),
        }),
      ]),
    );
  });

  it("searches read scope with title filter", async () => {
    readListStateFindMany.mockResolvedValue([
      {
        listStatus: "reading",
        readTitle: {
          id: "rt1",
          name: "Berserk",
          displayName: null,
          format: "manga",
          coverUrl: null,
        },
      },
    ]);

    const result = await service.search("user-1", "read:berserk", 10);

    expect(readListStateFindMany).toHaveBeenCalled();
    expect(libraryEntryFindMany).not.toHaveBeenCalled();
    expect(result.read.titles[0]?.name).toBe("Berserk");
  });

  it("respects custom limit", async () => {
    await service.search("user-1", "game:portal", 5);

    expect(wishlistItemFindMany.mock.calls[0]?.[0]?.take).toBe(5);
    expect(libraryEntryFindMany.mock.calls[0]?.[0]?.take).toBe(5);
  });
});
