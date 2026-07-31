import { beforeEach, describe, expect, it, vi } from "vitest";
import { FamilyService } from "../../src/family/family.service";
import { FAMILY_LIBRARY_PAGE_SIZE } from "../../src/family/family.constants";

describe("FamilyService.library overlap pagination", () => {
  const getOrCreate = vi.fn();
  const requireViewer = vi.fn();
  const loadMemberLibraries = vi.fn();
  const gameFindMany = vi.fn();
  let service: FamilyService;

  beforeEach(() => {
    getOrCreate.mockReset();
    requireViewer.mockReset();
    loadMemberLibraries.mockReset();
    gameFindMany.mockReset();

    const prisma = {
      game: { findMany: gameFindMany },
    } as any;

    service = new FamilyService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [
        {
          steamId: "76561198000000001",
          personaName: "Alice",
          avatarUrl: null,
          role: "owner",
          userId: "user-1",
        },
        {
          steamId: "76561198000000002",
          personaName: "Bob",
          avatarUrl: null,
          role: "member",
          userId: null,
        },
      ],
    });
    requireViewer.mockResolvedValue({
      id: "user-1",
      steamId: "76561198000000001",
      countryCode: "US",
    });
    gameFindMany.mockResolvedValue([
      {
        appId: 570,
        isFree: true,
        categories: "[]",
        headerImage: null,
        name: "Dota 2",
        currentPrice: 0,
        lowestPrice: 0,
      },
      {
        appId: 730,
        isFree: false,
        categories: "[]",
        headerImage: null,
        name: "CS2",
        currentPrice: 0,
        lowestPrice: 0,
      },
    ]);

    vi.spyOn(service as any, "getOrCreate").mockImplementation(getOrCreate);
    vi.spyOn(service as any, "requireViewer").mockImplementation(requireViewer);
    vi.spyOn(service as any, "loadMemberLibraries").mockImplementation(
      loadMemberLibraries,
    );
  });

  it("returns only overlapping games when overlapOnly is set", async () => {
    loadMemberLibraries.mockResolvedValue([
      {
        steamId: "76561198000000001",
        personaName: "Alice",
        avatarUrl: null,
        role: "owner",
        userId: "user-1",
        libraryValue: 0,
        games: new Map([
          [
            570,
            {
              appId: 570,
              name: "Dota 2",
              headerImage: null,
              playtimeForever: 10,
              priceValue: 0,
            },
          ],
          [
            730,
            {
              appId: 730,
              name: "CS2",
              headerImage: null,
              playtimeForever: 5,
              priceValue: 0,
            },
          ],
        ]),
      },
      {
        steamId: "76561198000000002",
        personaName: "Bob",
        avatarUrl: null,
        role: "member",
        userId: null,
        libraryValue: 0,
        games: new Map([
          [
            570,
            {
              appId: 570,
              name: "Dota 2",
              headerImage: null,
              playtimeForever: 20,
              priceValue: 0,
            },
          ],
        ]),
      },
    ]);

    const result = await service.library("user-1", {
      overlapOnly: true,
      page: 1,
      pageSize: 15,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      appId: 570,
      name: "Dota 2",
      ownerCount: 2,
    });
  });

  it("defaults to FAMILY_LIBRARY_PAGE_SIZE", async () => {
    loadMemberLibraries.mockResolvedValue([
      {
        steamId: "76561198000000001",
        personaName: "Alice",
        avatarUrl: null,
        role: "owner",
        userId: "user-1",
        libraryValue: 0,
        games: new Map(),
      },
    ]);

    const result = await service.library("user-1");

    expect(result.pageSize).toBe(FAMILY_LIBRARY_PAGE_SIZE);
  });
});
