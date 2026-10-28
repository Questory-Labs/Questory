import { describe, expect, it, vi } from "vitest";
import {
  bucketTimePlayed,
  sumMonthSpend,
} from "../../src/dashboard/dashboard-activity";
import { DashboardService } from "../../src/dashboard/dashboard.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const now = new Date("2026-10-29T12:00:00.000Z");

describe("bucketTimePlayed", () => {
  it("splits at local hour boundaries in half-hour offset zones", () => {
    const out = bucketTimePlayed(
      [{ startedAt: new Date("2026-10-27T18:00:00Z"), durationSecs: 3600 }],
      "Asia/Kolkata",
      new Date("2026-10-28T00:00:00Z"),
    );
    expect(out.todaySecs).toBe(1800);
    expect(out.weekSecs).toBe(3600);
    expect(out.weekHourlySecs[47]).toBe(1800);
    expect(out.weekHourlySecs[48]).toBe(1800);
  });

  it("splits sessions into today, week, month, prior week and hourly buckets", () => {
    const out = bucketTimePlayed(
      [
        { startedAt: new Date("2026-10-29T09:30:00.000Z"), durationSecs: 3600 },
        { startedAt: new Date("2026-10-27T20:00:00.000Z"), durationSecs: 1800 },
        { startedAt: new Date("2026-10-21T20:00:00.000Z"), durationSecs: 7200 },
        { startedAt: new Date("2026-09-30T20:00:00.000Z"), durationSecs: 600 },
      ],
      "UTC",
      now,
    );
    expect(out.todaySecs).toBe(3600);
    expect(out.weekSecs).toBe(5400);
    expect(out.priorWeekSecs).toBe(7200);
    expect(out.monthSecs).toBe(12600);
    expect(out.weekHourlySecs).toHaveLength(168);
    expect(out.weekHourlySecs[3 * 24 + 9]).toBe(1800);
    expect(out.weekHourlySecs[3 * 24 + 10]).toBe(1800);
    expect(out.weekHourlySecs[1 * 24 + 20]).toBe(1800);
  });

  it("returns zeroes without sessions", () => {
    const out = bucketTimePlayed([], "UTC", now);
    expect(out.weekSecs).toBe(0);
    expect(out.weekHourlySecs.every((v) => v === 0)).toBe(true);
  });
});

describe("sumMonthSpend", () => {
  it("sums current-month purchases in the dominant currency", () => {
    expect(
      sumMonthSpend(
        [
          { amount: 10, currency: "USD", purchasedAt: new Date("2026-10-02T00:00:00Z") },
          { amount: 5.5, currency: "USD", purchasedAt: new Date("2026-10-20T00:00:00Z") },
          { amount: 2, currency: "EUR", purchasedAt: new Date("2026-10-20T00:00:00Z") },
          { amount: 99, currency: "USD", purchasedAt: new Date("2026-09-20T00:00:00Z") },
        ],
        "UTC",
        now,
      ),
    ).toEqual({ amount: 15.5, currency: "USD" });
  });

  it("returns null with no purchases this month", () => {
    expect(sumMonthSpend([], "UTC", now)).toBeNull();
  });
});

describe("DashboardService.getStats activity", () => {
  it("adds time played, needs-you, synced sources and month spend", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ countryCode: "US" }) },
      libraryEntry: {
        count,
        aggregate: vi.fn().mockResolvedValue({ _sum: { playtimeForever: 0 } }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      wishlistItem: { count, findMany: vi.fn().mockResolvedValue([]) },
      friendship: { count },
      syncJob: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(1),
      },
      purchase: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          { amount: 20, currency: "USD", purchasedAt: new Date("2026-10-10T00:00:00Z") },
        ]),
      },
      playSession: {
        findMany: vi.fn().mockResolvedValue([
          { startedAt: new Date("2026-10-29T10:00:00.000Z"), durationSecs: 600 },
        ]),
        count: vi.fn().mockResolvedValue(2),
      },
      notification: { count: vi.fn().mockResolvedValue(3) },
      storeAccount: { count: vi.fn().mockResolvedValue(1) },
      sourceConnection: { count: vi.fn().mockResolvedValue(2) },
    };
    const service = new DashboardService(prisma as unknown as PrismaService);
    const stats = await service.getStats("u1", "UTC", now);

    expect(stats.timePlayed.todaySecs).toBe(600);
    expect(stats.needsYou).toEqual({
      total: 6,
      failedSyncs: 1,
      unmatchedSessions: 2,
      unreadNotifications: 3,
    });
    expect(stats.syncedSources).toBe(3);
    expect(stats.monthSpend).toEqual({ amount: 20, currency: "USD" });
    expect(prisma.playSession.findMany.mock.calls[0]?.[0]?.take).toBeGreaterThan(0);
    expect(prisma.syncJob.count.mock.calls[0]?.[0]?.where).toMatchObject({
      userId: "u1",
      status: "failed",
    });
  });
});
