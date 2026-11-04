import { describe, expect, it, vi } from "vitest";
import { CollectionsService, parseClusters } from "../../src/collections/collections.service";

function make(existing: { id: string; name: string; ruleKey: string | null }[]) {
  const prisma = {
    libraryEntry: {
      findMany: vi.fn().mockResolvedValue(["g1", "g2", "g3", "g4"].map((gameId) => ({ gameId }))),
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

describe("cluster collections", () => {
  it("drops malformed clusters and caps members", () => {
    expect(parseClusters("nope")).toEqual([]);
    const parsed = parseClusters([
      { id: "a", name: "Fast Runs", gameIds: ["g1", "g1", 3, "g2"] },
      { id: "", name: "x", gameIds: ["g1"] },
      { id: "b", name: "y".repeat(41), gameIds: ["g1"] },
    ]);
    expect(parsed).toEqual([{ id: "a", name: "Fast Runs", gameIds: ["g1", "g2"] }]);
  });

  it("creates owned-only collections, renames existing ones and removes stale clusters", async () => {
    const { prisma, service } = make([
      { id: "c-old", name: "Like Hades", ruleKey: "cluster:hades" },
      { id: "c-gone", name: "Old Shelf", ruleKey: "cluster:gone" },
      { id: "c-manual", name: "Cozy Evenings", ruleKey: null },
    ]);
    const written = await service.applyClusterCollections("u1", [
      { id: "hades", name: "Fast Runs", gameIds: ["g1", "g2", "g3", "x9"] },
      { id: "stardew", name: "Cozy Evenings", gameIds: ["g1", "g2", "g4"] },
      { id: "tiny", name: "Too Small", gameIds: ["g1", "x1", "x2"] },
    ]);
    expect(written).toBe(1);
    expect(prisma.collection.update).toHaveBeenCalledWith({
      where: { id: "c-old" },
      data: expect.objectContaining({ name: "Fast Runs" }),
    });
    expect(prisma.collection.create).not.toHaveBeenCalled();
    expect(prisma.collectionItem.createMany).toHaveBeenCalledWith({
      data: ["g1", "g2", "g3"].map((gameId) => ({ collectionId: "c-old", gameId })),
    });
    expect(prisma.collection.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", id: { in: ["c-gone"] } },
    });
  });

  it("creates a new cluster collection when the name is free", async () => {
    const { prisma, service } = make([]);
    await service.applyClusterCollections("u1", [
      { id: "stardew", name: "Slow Seasons", gameIds: ["g1", "g2", "g4"] },
    ]);
    expect(prisma.collection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1", name: "Slow Seasons", type: "auto", ruleKey: "cluster:stardew" }),
    });
    expect(prisma.collection.deleteMany).not.toHaveBeenCalled();
  });
});
