import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCronSchedule } from "../../src/cron/cron-schedules";
import { InternalCronService } from "../../src/cron/internal-cron.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { SyncService } from "../../src/sync/sync.service";

describe("price-sync cron schedule", () => {
  const prevPrice = process.env.CRON_PRICE_SCHEDULE;
  const prevFriends = process.env.CRON_FRIENDS_SCHEDULE;

  afterEach(() => {
    if (prevPrice === undefined) {
      delete process.env.CRON_PRICE_SCHEDULE;
    } else {
      process.env.CRON_PRICE_SCHEDULE = prevPrice;
    }
    if (prevFriends === undefined) {
      delete process.env.CRON_FRIENDS_SCHEDULE;
    } else {
      process.env.CRON_FRIENDS_SCHEDULE = prevFriends;
    }
  });

  it("defaults to 5 AM daily", () => {
    delete process.env.CRON_PRICE_SCHEDULE;
    delete process.env.CRON_FRIENDS_SCHEDULE;
    expect(getCronSchedule("price-sync")).toBe("0 5 * * *");
  });

  it("respects CRON_PRICE_SCHEDULE override", () => {
    process.env.CRON_PRICE_SCHEDULE = "30 2 * * *";
    expect(getCronSchedule("price-sync")).toBe("30 2 * * *");
  });

  it("falls back to CRON_FRIENDS_SCHEDULE when CRON_PRICE_SCHEDULE is unset", () => {
    delete process.env.CRON_PRICE_SCHEDULE;
    process.env.CRON_FRIENDS_SCHEDULE = "15 6 * * *";
    expect(getCronSchedule("price-sync")).toBe("15 6 * * *");
  });
});

describe("InternalCronService.syncPricesDaily", () => {
  const findMany = vi.fn();
  const enqueueDailyPriceSync = vi.fn();

  let service: InternalCronService;

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      { userId: "user-1", providerAccountId: "steam-1" },
      { userId: "user-2", providerAccountId: "steam-2" },
    ]);
    enqueueDailyPriceSync.mockReset().mockResolvedValue(undefined);

    const prisma = {
      account: { findMany },
    } as unknown as PrismaService;

    const sync = {
      enqueueDailyPriceSync,
    } as unknown as SyncService;

    service = new InternalCronService(
      prisma,
      {} as never,
      sync,
      {} as never,
    );
  });

  it("enqueues metadata-refresh for every Steam account", async () => {
    const result = await service.syncPricesDaily();

    expect(findMany).toHaveBeenCalledWith({
      where: { provider: "steam" },
      select: { userId: true, providerAccountId: true },
    });
    expect(enqueueDailyPriceSync).toHaveBeenCalledTimes(2);
    expect(enqueueDailyPriceSync).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "steam-1",
    );
    expect(result).toEqual({ users: 2, enqueued: 2, failed: 0 });
  });

  it("counts per-user enqueue failures without aborting the loop", async () => {
    enqueueDailyPriceSync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("queue down"));

    const result = await service.syncPricesDaily();

    expect(result).toEqual({ users: 2, enqueued: 1, failed: 1 });
  });
});

describe("InternalCronService.dailyRefresh", () => {
  const findMany = vi.fn();
  const enqueueDailyLibrarySync = vi.fn();

  let service: InternalCronService;

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      { userId: "user-1", providerAccountId: "steam-1" },
    ]);
    enqueueDailyLibrarySync.mockReset().mockResolvedValue(undefined);

    const prisma = {
      account: { findMany },
    } as unknown as PrismaService;

    const sync = {
      enqueueDailyLibrarySync,
    } as unknown as SyncService;

    service = new InternalCronService(
      prisma,
      {} as never,
      sync,
      {} as never,
    );
  });

  it("enqueues library-sync only (user + friends libraries)", async () => {
    const result = await service.dailyRefresh();

    expect(enqueueDailyLibrarySync).toHaveBeenCalledWith("user-1", "steam-1");
    expect(result).toEqual({ users: 1, enqueued: 1, failed: 0 });
  });
});
