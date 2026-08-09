import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagsService } from "../../src/tags/tags.service";

describe("TagsService", () => {
  const findMany = vi.fn();
  const deleteMany = vi.fn();
  const upsert = vi.fn();
  const create = vi.fn();
  const transaction = vi.fn();

  const prisma = {
    mediaTag: { findMany, deleteMany, create },
    tag: { upsert },
    $transaction: transaction,
  };

  const service = new TagsService(prisma as never);

  beforeEach(() => {
    findMany.mockReset();
    deleteMany.mockReset();
    upsert.mockReset();
    create.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
  });

  it("lists tags for a media item", async () => {
    findMany.mockResolvedValue([
      {
        isUserModified: true,
        weight: 1,
        tag: { id: "t1", name: "Cozy" },
      },
    ]);

    const result = await service.listForMedia("steam_game", "game-1");
    expect(findMany).toHaveBeenCalledWith({
      where: { mediaType: "steam_game", mediaId: "game-1" },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });
    expect(result.tags).toEqual([
      { id: "t1", name: "Cozy", isUserModified: true, weight: 1 },
    ]);
  });

  it("replaces tags and dedupes by normalized name", async () => {
    upsert.mockResolvedValue({ id: "t1", name: "Cozy" });
    create.mockResolvedValue({});
    findMany.mockResolvedValue([
      {
        isUserModified: true,
        weight: 1,
        tag: { id: "t1", name: "Cozy" },
      },
    ]);

    await service.replaceForMedia("read_title", "rt-1", [
      "Cozy",
      " cozy ",
      "Short",
    ]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { mediaType: "read_title", mediaId: "rt-1" },
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
