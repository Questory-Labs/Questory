import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { CollectionsService } from "../../src/collections/collections.service";

const DAY = 86_400_000;

function libEntry(
  gameId: string,
  over: Partial<{
    playtimeForever: number;
    lastPlayedAt: Date | null;
    achievementPct: number | null;
    userStatus: string | null;
    appId: number;
    categories: string[];
    hltbMainHours: number | null;
  }> = {},
) {
  return {
    gameId,
    playtimeForever: over.playtimeForever ?? 0,
    lastPlayedAt: over.lastPlayedAt ?? null,
    purchasedAt: null,
    achievementPct: over.achievementPct ?? null,
    userStatus: over.userStatus ?? null,
    game: {
      appId: over.appId ?? null,
      name: gameId,
      genres: "[]",
      tags: "[]",
      categories: JSON.stringify(over.categories ?? []),
      deckStatus: null,
      reviewScore: null,
      hltbMainHours: over.hltbMainHours ?? null,
    },
  };
}

function makeRebuild(library: ReturnType<typeof libEntry>[]) {
  const created: Record<string, string[]> = {};
  const prisma = {
    libraryEntry: { findMany: vi.fn().mockResolvedValue(library) },
    friendship: {
      findMany: vi.fn().mockResolvedValue([{ friendSteamId: "f1" }]),
    },
    friendLibraryCache: {
      findMany: vi.fn().mockResolvedValue([{ gameAppId: 10 }]),
    },
    collection: {
      upsert: vi.fn().mockImplementation(async ({ create }) => ({
        id: create.ruleKey,
      })),
    },
    collectionItem: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockImplementation(async ({ data }) => {
        for (const row of data) {
          (created[row.collectionId] ||= []).push(row.gameId);
        }
      }),
    },
  };
  return { prisma, created, service: new CollectionsService(prisma as never) };
}

describe("new auto collection rules", () => {
  it("assigns games to backlog, completion, forgotten, co-op and short rules", async () => {
    const { service, created, prisma } = makeRebuild([
      libEntry("quick", { playtimeForever: 30 }),
      libEntry("quick-finished", { playtimeForever: 30, userStatus: "finished" }),
      libEntry("near", { playtimeForever: 600, achievementPct: 85 }),
      libEntry("done", { playtimeForever: 600, achievementPct: 100 }),
      libEntry("forgotten", {
        playtimeForever: 3000,
        lastPlayedAt: new Date(Date.now() - 300 * DAY),
      }),
      libEntry("recent-fav", {
        playtimeForever: 3000,
        lastPlayedAt: new Date(Date.now() - 10 * DAY),
      }),
      libEntry("coop", { appId: 10, playtimeForever: 120, categories: ["Online Co-op"] }),
      libEntry("coop-alone", { appId: 11, playtimeForever: 120, categories: ["Online Co-op"] }),
      libEntry("short", { playtimeForever: 120, hltbMainHours: 4 }),
      libEntry("long", { playtimeForever: 120, hltbMainHours: 40 }),
    ]);
    await service.rebuildAutoCollections("u1");
    expect(created.backlog_under_1h).toEqual(["quick"]);
    expect(created.near_completion).toEqual(["near"]);
    expect(created.forgotten_favourites).toEqual(["forgotten"]);
    expect(created.coop_with_friends).toEqual(["coop"]);
    expect(created.short_and_sweet).toEqual(["short"]);
    expect(prisma.friendLibraryCache.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerSteamId: { in: ["f1"] }, gameAppId: { in: [10, 11] } },
      }),
    );
  });
});

describe("CollectionsService.list", () => {
  it("returns color, updatedAt and up to four cover previews", async () => {
    const updatedAt = new Date("2026-10-01T00:00:00Z");
    const prisma = {
      collection: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "c1",
            name: "Mine",
            type: "custom",
            ruleKey: null,
            description: null,
            color: "#8fd6c4",
            updatedAt,
            _count: { items: 6 },
            items: [
              { game: { headerImage: "a.jpg" } },
              { game: { headerImage: "b.jpg" } },
            ],
          },
        ]),
      },
    };
    const service = new CollectionsService(prisma as never);
    const res = await service.list("u1");
    expect(res[0]).toMatchObject({
      color: "#8fd6c4",
      updatedAt: updatedAt.toISOString(),
      covers: ["a.jpg", "b.jpg"],
      gameCount: 6,
    });
    const include = prisma.collection.findMany.mock.calls[0][0].include;
    expect(include.items.take).toBe(4);
  });
});

describe("taste cluster preview and save", () => {
  function make(existing: { id: string; name: string; ruleKey: string | null }[]) {
    const prisma = {
      libraryEntry: {
        findMany: vi
          .fn()
          .mockResolvedValue(["g1", "g2", "g3", "g4"].map((gameId) => ({ gameId }))),
      },
      collection: {
        findMany: vi.fn().mockResolvedValue(existing),
        create: vi.fn().mockImplementation(async ({ data }) => ({ id: `new-${data.ruleKey}` })),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      collectionItem: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
      },
    };
    return { prisma, service: new CollectionsService(prisma as never) };
  }
  const raw = [
    { id: "a", name: "Tight roguelites", gameIds: ["g1", "g2", "g3"] },
    { id: "b", name: "Cozy", gameIds: ["g1", "g4", "x"] },
    { id: "c", name: "Builders", gameIds: ["g2", "g3", "g4", "g1"] },
  ];

  it("previews eligible clusters with saved flags", async () => {
    const { service } = make([{ id: "c-old", name: "Builders", ruleKey: "cluster:c" }]);
    expect(await service.previewClusters("u1", raw)).toEqual([
      { id: "a", name: "Tight roguelites", gameCount: 3, saved: false },
      { id: "c", name: "Builders", gameCount: 4, saved: true },
    ]);
  });

  it("saves one cluster without deleting the others", async () => {
    const { service, prisma } = make([{ id: "c-old", name: "Builders", ruleKey: "cluster:c" }]);
    expect(await service.saveCluster("u1", raw, "a")).toEqual({ saved: true });
    expect(prisma.collection.create).toHaveBeenCalledTimes(1);
    expect(prisma.collection.deleteMany).not.toHaveBeenCalled();
  });

  it("404s unknown or ineligible clusters", async () => {
    const { service } = make([]);
    await expect(service.saveCluster("u1", raw, "zzz")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.saveCluster("u1", raw, "b")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
