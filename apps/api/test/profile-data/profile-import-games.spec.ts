import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileImportGamesService } from "../../src/profile-data/profile-import-games.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { GameMergeService } from "../../src/stores/game-merge.service";
import type { QmonitorSessionRulesService } from "../../src/qmonitor/qmonitor-session-rules.service";
import type { QuestoryProfileArchive } from "@questorylabs/shared";

const archive = {
  format: "questory.profile" as const,
  version: 1 as const,
  exportedAt: "2026-08-29T12:00:00.000Z",
  services: [],
  profile: {},
  library: [],
  wishlistTargets: [],
  purchases: [
    {
      store: "steam",
      externalId: "570",
      appId: 570,
      amount: 10,
      currency: "USD",
      purchasedAt: "2024-01-01T00:00:00.000Z",
      source: "manual",
    },
  ],
  collections: [
    {
      name: "Co-op",
      items: [{ store: "steam" as const, externalId: "570", appId: 570, name: "Dota 2" }],
    },
  ],
  playSessions: [],
  playSessionRules: [],
  music: { rules: [], labels: [], listens: [] },
  watch: { events: [], listStates: [] },
  read: { events: [], listStates: [] },
} satisfies QuestoryProfileArchive;

describe("ProfileImportGamesService", () => {
  const purchaseFindFirst = vi.fn();
  const purchaseCreate = vi.fn();
  const collectionFindFirst = vi.fn();
  const collectionCreate = vi.fn();
  const collectionItemUpsert = vi.fn();
  const upsertListing = vi.fn();

  let service: ProfileImportGamesService;

  beforeEach(() => {
    purchaseFindFirst.mockReset();
    purchaseCreate.mockReset();
    collectionFindFirst.mockReset();
    collectionCreate.mockReset();
    collectionItemUpsert.mockReset();
    upsertListing.mockReset().mockResolvedValue({
      game: { id: "g1", appId: 570, name: "Dota 2" },
    });

    const prisma = {
      purchase: { findFirst: purchaseFindFirst, create: purchaseCreate },
      collection: {
        findFirst: collectionFindFirst,
        create: collectionCreate,
      },
      collectionItem: { upsert: collectionItemUpsert },
    } as unknown as PrismaService;

    const merge = { upsertListing } as unknown as GameMergeService;
    const sessionRules = {
      invalidateRulesCache: vi.fn(),
      resolveTarget: vi.fn(),
    } as unknown as QmonitorSessionRulesService;

    service = new ProfileImportGamesService(prisma, merge, sessionRules);
  });

  it("skips a purchase that already exists", async () => {
    purchaseFindFirst.mockResolvedValue({ id: "p1" });
    const result = await service.applyPurchases("u1", archive);
    expect(result).toEqual({ accepted: 0, skipped: 1 });
    expect(purchaseCreate).not.toHaveBeenCalled();
  });

  it("adds collection items resolved by Steam app id", async () => {
    collectionFindFirst.mockResolvedValue(null);
    collectionCreate.mockResolvedValue({ id: "c1", name: "Co-op" });
    collectionItemUpsert.mockResolvedValue({});
    const result = await service.applyCollections("u1", archive);
    expect(upsertListing).toHaveBeenCalledWith(
      expect.objectContaining({
        store: "steam",
        externalId: "570",
        steamAppId: 570,
      }),
    );
    expect(collectionItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { collectionId: "c1", gameId: "g1" },
      }),
    );
    expect(result.accepted).toBe(1);
  });
});
