import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { AdminUserOpsService } from "../../src/admin/admin-user-ops.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("AdminUserOpsService", () => {
  const findUnique = vi.fn();
  const listenFindMany = vi.fn();
  const getSteamId = vi.fn();
  const enqueueAll = vi.fn();
  const refreshPrices = vi.fn();
  const enqueueTrack = vi.fn();
  const syncHistory = vi.fn();

  let service: AdminUserOpsService;

  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue({ id: "user-1" });
    listenFindMany.mockReset().mockResolvedValue([{ trackId: "track-1" }]);
    getSteamId.mockReset().mockResolvedValue("steam-1");
    enqueueAll.mockReset().mockResolvedValue({ ok: true });
    refreshPrices.mockReset().mockResolvedValue({ ok: true });
    enqueueTrack.mockReset().mockResolvedValue(undefined);
    syncHistory.mockReset().mockResolvedValue({ ok: true });

    const prisma = {
      user: { findUnique },
      listen: { findMany: listenFindMany },
    } as unknown as PrismaService;

    service = new AdminUserOpsService(
      prisma,
      { getSteamId } as never,
      { enqueueAll } as never,
      { refreshPrices } as never,
      { enqueueTrack } as never,
      { syncHistory } as never,
      { syncUser: vi.fn() } as never,
      { syncList: vi.fn() } as never,
      { syncList: vi.fn() } as never,
      { syncList: vi.fn() } as never,
      { syncList: vi.fn() } as never,
      { syncList: vi.fn() } as never,
    );
  });

  it("syncs catalog via Steam enqueueAll", async () => {
    await service.syncTarget("user-1", "catalog");

    expect(getSteamId).toHaveBeenCalledWith("user-1");
    expect(enqueueAll).toHaveBeenCalledWith("user-1", "steam-1", {
      force: true,
    });
  });

  it("rejects catalog sync without Steam", async () => {
    getSteamId.mockResolvedValue(null);

    await expect(service.syncTarget("user-1", "catalog")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("syncs price via cost service", async () => {
    await service.syncTarget("user-1", "price");
    expect(refreshPrices).toHaveBeenCalledWith("user-1");
  });

  it("enqueues music enrichment for distinct user tracks", async () => {
    const result = await service.syncTarget("user-1", "music");

    expect(listenFindMany).toHaveBeenCalled();
    expect(enqueueTrack).toHaveBeenCalledWith("track-1");
    expect(result).toEqual({ ok: true, enqueued: 1, userId: "user-1" });
  });
});
