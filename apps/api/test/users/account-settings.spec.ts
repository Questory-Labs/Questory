import { describe, expect, it, vi } from "vitest";
import { HttpException } from "@nestjs/common";
import { UserSyncService } from "../../src/sync/user-sync.service";
import { CacheService } from "../../src/cache/cache.service";
import { QmonitorDevicesService } from "../../src/qmonitor/qmonitor-devices.service";
import { ConnectionsService } from "../../src/users/connections.service";
import { ShellNavCountsService } from "../../src/shell/shell-nav-counts.service";
import { UsersController } from "../../src/users/users.controller";
import { AuthService } from "../../src/auth/auth.service";
import { hashPassword, verifyPassword } from "../../src/auth/password";
import { MultiplayerService } from "../../src/multiplayer/multiplayer.service";

describe("UserSyncService.request", () => {
  const make = (opts: { steamId?: string | null; active?: boolean } = {}) => {
    const enqueueAll = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      syncJob: {
        findFirst: vi.fn().mockResolvedValue(opts.active ? { id: "j" } : null),
      },
    } as any;
    const accounts = {
      getSteamId: vi
        .fn()
        .mockResolvedValue(opts.steamId === undefined ? "765" : opts.steamId),
    } as any;
    const service = new UserSyncService(
      prisma,
      new CacheService(),
      accounts,
      { enqueueAll } as any,
    );
    return { service, enqueueAll };
  };

  it("queues a forced sync then enforces the cooldown", async () => {
    const { service, enqueueAll } = make();
    await expect(service.request("u1")).resolves.toEqual({ queued: true });
    expect(enqueueAll).toHaveBeenCalledWith("u1", "765", { force: true });

    const err = await service.request("u1").catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse().retryAfterSec).toBeGreaterThan(0);
    expect(err.getResponse().retryAfterSec).toBeLessThanOrEqual(600);
  });

  it("rejects without Steam (400) and while a job runs (409)", async () => {
    await expect(make({ steamId: null }).service.request("u2")).rejects.toMatchObject({
      status: 400,
    });
    await expect(make({ active: true }).service.request("u3")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("releases the cooldown when enqueue fails", async () => {
    const { service, enqueueAll } = make();
    enqueueAll.mockRejectedValueOnce(new Error("boom"));
    await expect(service.request("u4")).rejects.toThrow("boom");
    await expect(service.request("u4")).resolves.toEqual({ queued: true });
  });
});

describe("QmonitorDevicesService", () => {
  it("revokes only the caller's devices", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi
      .fn()
      .mockImplementation(({ where }) =>
        Promise.resolve(where.userId === "u1" ? { id: where.id, revokedAt: null } : null),
      );
    const service = new QmonitorDevicesService({
      qmonitorDeviceSession: { findFirst, updateMany },
    } as any);

    await expect(service.revoke("u1", "d1")).resolves.toEqual({ ok: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "d1", userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    await expect(service.revoke("u2", "d1")).rejects.toMatchObject({ status: 404 });
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("lists devices scoped to the user", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "d1",
        label: null,
        lastUsedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        revokedAt: null,
      },
    ]);
    const service = new QmonitorDevicesService({
      qmonitorDeviceSession: { findMany },
    } as any);
    const res = await service.list("u1");
    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "u1" });
    expect(res.devices[0]).toEqual({
      id: "d1",
      label: null,
      lastUsedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    });
  });
});

describe("ConnectionsService.overview", () => {
  it("expands sources per domain and never selects tokens", async () => {
    const sourceFindMany = vi.fn().mockResolvedValue([
      { id: "c1", provider: "anilist", lastSyncedAt: null, lastError: null },
      { id: "c2", provider: "lastfm", lastSyncedAt: new Date(0), lastError: "x" },
    ]);
    const service = new ConnectionsService({
      account: {
        findMany: vi.fn().mockResolvedValue([
          {
            provider: "steam",
            providerAccountId: "765",
            displayName: "Me",
            createdAt: new Date("2026-01-01T00:00:00Z"),
          },
        ]),
      },
      sourceConnection: { findMany: sourceFindMany },
      apiKey: { findMany: vi.fn().mockResolvedValue([]) },
      qmonitorDeviceSession: { count: vi.fn().mockResolvedValue(2) },
      user: { findUnique: vi.fn().mockResolvedValue({ lastSyncedAt: null }) },
    } as any);

    const res = await service.overview("u1");

    const select = sourceFindMany.mock.calls[0][0].select;
    expect(Object.keys(select).some((k) => /token|secret/i.test(k))).toBe(false);
    expect(res.sources.map((s) => s.id).sort()).toEqual(
      ["music:c2", "read:c1", "watch:c1"].sort(),
    );
    expect(res.sources.find((s) => s.id === "music:c2")?.status).toBe("error");
    expect(res.accounts[0]).toMatchObject({ provider: "steam", externalId: "765" });
    expect(res.qmonitorDeviceCount).toBe(2);
  });
});

describe("ShellNavCountsService", () => {
  it("counts and caches per user", async () => {
    const count = (n: number) => ({ count: vi.fn().mockResolvedValue(n) });
    const prisma = {
      libraryEntry: count(10),
      wishlistItem: count(3),
      listen: count(100),
      watchEvent: { findMany: vi.fn().mockResolvedValue([{}, {}]) },
      readEvent: { findMany: vi.fn().mockResolvedValue([{}]) },
      goal: count(1),
      sourceConnection: count(2),
      account: count(1),
    } as any;
    const service = new ShellNavCountsService(prisma, new CacheService());

    const expected = {
      library: 10,
      wishlist: 3,
      musicListens: 100,
      watchTitles: 2,
      readTitles: 1,
      activeGoals: 1,
      connectedSources: 3,
    };
    await expect(service.getCounts("u1")).resolves.toEqual(expected);
    await expect(service.getCounts("u1")).resolves.toEqual(expected);
    expect(prisma.libraryEntry.count).toHaveBeenCalledTimes(1);
  });
});

describe("UsersController.deleteMe", () => {
  const make = () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
    const abuse = { assertOriginAllowed: vi.fn() };
    const controller = new UsersController({ deleteAccount } as any, abuse as any);
    const res = { clearCookie: vi.fn() } as any;
    const req = { headers: { origin: "http://localhost:3000" } } as any;
    return { controller, deleteAccount, abuse, res, req };
  };

  it("requires the DELETE confirmation", async () => {
    const { controller, deleteAccount, res, req } = make();
    await expect(
      controller.deleteMe({ userId: "u1" }, req, res, { confirm: "delete" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it("deletes the caller and clears the session", async () => {
    const { controller, deleteAccount, abuse, res, req } = make();
    await expect(
      controller.deleteMe({ userId: "u1" }, req, res, { confirm: "DELETE" }),
    ).resolves.toEqual({ ok: true });
    expect(abuse.assertOriginAllowed).toHaveBeenCalled();
    expect(deleteAccount).toHaveBeenCalledWith("u1");
    expect(res.clearCookie).toHaveBeenCalled();
  });
});

describe("AuthService.changePassword", () => {
  it("updates only when the current password matches", async () => {
    const passwordHash = await hashPassword("old-password-123");
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ passwordHash }), update },
    } as any;
    const service = new AuthService(prisma, {} as any, {} as any, {} as any);

    await expect(
      service.changePassword("u1", "wrong-password", "new-password-456"),
    ).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();

    await expect(
      service.changePassword("u1", "old-password-123", "new-password-456"),
    ).resolves.toBe(true);
    const saved = update.mock.calls[0][0].data.passwordHash;
    expect(await verifyPassword(saved, "new-password-456")).toBe(true);
  });
});

describe("MultiplayerService playedTogether sort", () => {
  it("orders by combined playtime, then review score", () => {
    const service = new MultiplayerService({} as any, {} as any, {} as any);
    const g = (appId: number, togetherMinutes: number, reviewScore: number) =>
      ({ appId, name: `G${appId}`, togetherMinutes, reviewScore, isSuggested: false }) as any;
    const games = [g(1, 10, 90), g(2, 500, 50), g(3, 10, 95)];
    (service as any).sortGames(games, "playedTogether");
    expect(games.map((x: any) => x.appId)).toEqual([2, 3, 1]);
  });
});

describe("StoresService.listStatus", () => {
  it("fills Steam identity and last sync from real data", async () => {
    const { StoresService } = await import("../../src/stores/stores.service");
    const service = new StoresService(
      {
        account: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ providerAccountId: "765", displayName: "Me" }),
        },
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ lastSyncedAt: new Date("2026-02-01T00:00:00Z") }),
        },
      } as any,
      {} as any,
      {} as any,
    );
    const rows = await service.listStatus("u1");
    expect(rows.find((r) => r.store === "steam")).toMatchObject({
      displayName: "Me",
      externalUserId: "765",
      lastSyncedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(rows.filter((r) => r.store !== "steam").every((r) => !r.connected)).toBe(true);
  });
});
