import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LibraryService } from "../../src/library/library.service";
import { LibraryController } from "../../src/library/library.controller";

function entry(
  id: string,
  over: Partial<{
    playtimeForever: number;
    lastPlayedAt: Date | null;
    userStatus: string | null;
    pricePaid: number | null;
    name: string;
    tags: string[];
    publishers: string[];
    currentPrice: number | null;
  }> = {},
) {
  return {
    id,
    gameId: `g-${id}`,
    playtimeForever: over.playtimeForever ?? 600,
    playtime2Weeks: null,
    lastPlayedAt: over.lastPlayedAt ?? null,
    pricePaid: over.pricePaid ?? null,
    purchasedAt: null,
    isFamilyShared: false,
    hidden: false,
    achievementUnlocked: 4,
    achievementTotal: 10,
    achievementPct: 40,
    userStatus: over.userStatus ?? null,
    userStatusAt: null,
    ownerships: [],
    game: {
      id: `g-${id}`,
      appId: Number(id.replace(/\D/g, "")) || 1,
      name: over.name ?? `Game ${id}`,
      headerImage: null,
      genres: "[]",
      categories: "[]",
      tags: JSON.stringify(over.tags ?? []),
      developers: "[]",
      publishers: JSON.stringify(over.publishers ?? []),
      reviewScore: null,
      isFree: false,
      currentPrice: over.currentPrice ?? 20,
      lowestPrice: null,
      deckStatus: null,
      controllers: "[]",
      multiplayerCaps: "[]",
      storeListings: [],
    },
  };
}

function makeService(rows: ReturnType<typeof entry>[]) {
  const prisma = {
    libraryEntry: {
      findMany: vi.fn().mockResolvedValue(rows),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    purchase: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findUnique: vi.fn().mockResolvedValue({ countryCode: "US" }) },
  };
  return { prisma, service: new LibraryService(prisma as never) };
}

describe("LibraryService.list", () => {
  const rows = [
    entry("e1", { playtimeForever: 0, userStatus: "backlog", name: "Zeta" }),
    entry("e2", { playtimeForever: 1200, userStatus: "playing", name: "alpha", tags: ["Roguelike"] }),
    entry("e3", { playtimeForever: 60, userStatus: "finished", name: "Mid", publishers: ["Devolver"] }),
    entry("e4", { playtimeForever: 300, name: "Beta" }),
  ];

  it("returns facet counts, achievements, status and value fields", async () => {
    const { service } = makeService(rows);
    const res = await service.list("u1", { page: 1, pageSize: 24 });
    expect(res.facets).toEqual({
      all: 4,
      neverPlayed: 1,
      playing: 1,
      backlog: 1,
      finished: 1,
      dropped: 0,
    });
    expect(res.currency).toBe("USD");
    const e2 = res.items.find((i) => i.id === "e2")!;
    expect(e2).toMatchObject({
      achievementPct: 40,
      achievementUnlocked: 4,
      achievementTotal: 10,
      userStatus: "playing",
      valueAmount: 20,
      costPerHour: 1,
    });
  });

  it("filters by status while facets keep the unfiltered counts", async () => {
    const { service } = makeService(rows);
    const res = await service.list("u1", { status: "neverPlayed" });
    expect(res.items.map((i) => i.id)).toEqual(["e1"]);
    expect(res.total).toBe(1);
    expect(res.facets.all).toBe(4);
    const playing = await service.list("u1", { status: "playing" });
    expect(playing.items.map((i) => i.id)).toEqual(["e2"]);
  });

  it("sorts by hours, name and value per hour", async () => {
    const { service } = makeService(rows);
    expect(
      (await service.list("u1", { sort: "hours" })).items.map((i) => i.id),
    ).toEqual(["e2", "e4", "e3", "e1"]);
    expect(
      (await service.list("u1", { sort: "name" })).items.map((i) => i.id),
    ).toEqual(["e2", "e4", "e3", "e1"]);
    expect(
      (await service.list("u1", { sort: "valuePerHour" })).items.map((i) => i.id),
    ).toEqual(["e2", "e4", "e3", "e1"]);
  });

  it("matches q against tags and publishers", async () => {
    const { service, prisma } = makeService(rows);
    expect(
      (await service.list("u1", { q: "rogue" })).items.map((i) => i.id),
    ).toEqual(["e2"]);
    expect(
      (await service.list("u1", { q: "devolver" })).items.map((i) => i.id),
    ).toEqual(["e3"]);
    expect(prisma.libraryEntry.findMany.mock.calls[0][0].where.game).toBeUndefined();
  });
});

describe("LibraryService.setStatus", () => {
  it("404s when the entry is not the caller's", async () => {
    const { service, prisma } = makeService([]);
    prisma.libraryEntry.findFirst.mockResolvedValue(null);
    await expect(service.setStatus("u1", "g-x", "playing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.libraryEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", gameId: "g-x" } }),
    );
    expect(prisma.libraryEntry.update).not.toHaveBeenCalled();
  });

  it("sets and clears status with timestamp", async () => {
    const { service, prisma } = makeService([]);
    prisma.libraryEntry.findFirst.mockResolvedValue({ id: "e1" });
    prisma.libraryEntry.update.mockResolvedValue(entry("e1", { userStatus: "finished" }));
    const res = await service.setStatus("u1", "g-e1", "finished");
    expect(res.userStatus).toBe("finished");
    const data = prisma.libraryEntry.update.mock.calls[0][0].data;
    expect(data.userStatus).toBe("finished");
    expect(data.userStatusAt).toBeInstanceOf(Date);

    prisma.libraryEntry.update.mockResolvedValue(entry("e1"));
    await service.setStatus("u1", "g-e1", null);
    expect(prisma.libraryEntry.update.mock.calls[1][0].data).toEqual({
      userStatus: null,
      userStatusAt: null,
    });
  });
});

describe("LibraryController validation", () => {
  const library = {
    list: vi.fn().mockResolvedValue({}),
    setStatus: vi.fn().mockResolvedValue({}),
    getOneByAppId: vi.fn(),
  };
  const controller = new LibraryController(library as never);
  const user = { userId: "u1" };

  it("rejects unknown sort and status values", () => {
    expect(() =>
      controller.list(user, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, "price"),
    ).toThrow(BadRequestException);
    expect(() =>
      controller.list(user, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, "wishlisted"),
    ).toThrow(BadRequestException);
  });

  it("rejects an invalid status body", async () => {
    await expect(
      controller.updateStatus(user, "g1", { status: "abandoned" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(library.setStatus).not.toHaveBeenCalled();
  });

  it("404s a numeric appId that is not in the library", async () => {
    library.getOneByAppId.mockResolvedValue(null);
    await expect(
      controller.updateStatus(user, "570", { status: "playing" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("passes a valid status through", async () => {
    await controller.updateStatus(user, "g1", { status: null });
    expect(library.setStatus).toHaveBeenCalledWith("u1", "g1", null);
  });
});
