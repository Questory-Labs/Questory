import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { CollectionsService } from "../../src/collections/collections.service";
import { COLLECTION_GAMES_PAGE_SIZE } from "../../src/collections/collections.constants";

describe("CollectionsService.getOne pagination", () => {
  const findFirst = vi.fn();
  const count = vi.fn();
  const findMany = vi.fn();
  let service: CollectionsService;

  beforeEach(() => {
    findFirst.mockReset();
    count.mockReset();
    findMany.mockReset();
    const prisma = {
      collection: { findFirst },
      collectionItem: { count, findMany },
    } as any;
    service = new CollectionsService(prisma);
  });

  it("returns total/page/pageSize and skips to the requested page", async () => {
    findFirst.mockResolvedValue({
      id: "col-1",
      name: "Never Played",
      type: "auto",
      ruleKey: "never_played",
      description: "Games still waiting",
    });
    count.mockResolvedValue(42);
    findMany.mockResolvedValue([
      {
        game: {
          appId: 570,
          name: "Dota 2",
          headerImage: null,
          genres: '["Action"]',
        },
      },
    ]);

    const result = await service.getOne("user-1", "col-1", { page: 2, pageSize: 15 });

    expect(result).toMatchObject({
      total: 42,
      page: 2,
      pageSize: 15,
      name: "Never Played",
    });
    expect(result.games).toHaveLength(1);
    expect(result.games[0]).toMatchObject({ appId: 570, name: "Dota 2" });
    expect(count).toHaveBeenCalledWith({ where: { collectionId: "col-1" } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId: "col-1" },
        skip: 15,
        take: 15,
      }),
    );
  });

  it("defaults to COLLECTION_GAMES_PAGE_SIZE", async () => {
    findFirst.mockResolvedValue({
      id: "col-1",
      name: "Test",
      type: "custom",
      ruleKey: null,
      description: null,
    });
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const result = await service.getOne("user-1", "col-1");

    expect(result.pageSize).toBe(COLLECTION_GAMES_PAGE_SIZE);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: COLLECTION_GAMES_PAGE_SIZE,
        skip: 0,
      }),
    );
  });

  it("throws when collection is not owned by user", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.getOne("user-a", "col-b")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(count).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
