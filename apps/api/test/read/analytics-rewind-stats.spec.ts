import { describe, expect, it, vi } from "vitest";
import { ReadAnalyticsService } from "../../src/read/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("Read AnalyticsService.rewindStats", () => {
  it("bounds the period in the local zone and compares to the prior one via groupBy", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        readTitleId: "t1",
        readAt: new Date("2025-01-10T12:00:00Z"),
        chaptersRead: 10,
        volumesRead: 2,
        status: "COMPLETED",
        readTitle: { name: "Berserk", format: "manga", coverUrl: null, genres: [] },
      },
    ]);
    const groupBy = vi.fn().mockResolvedValue([
      { readTitleId: "t1", _count: { _all: 3 } },
      { readTitleId: "t2", _count: { _all: 5 } },
    ]);
    const aggregate = vi
      .fn()
      .mockResolvedValue({ _min: { readAt: new Date("2023-01-01T00:00:00Z") } });
    const titleFindMany = vi.fn().mockResolvedValue([{ id: "t2", name: "Vagabond" }]);
    const listFindMany = vi.fn().mockResolvedValue([{ readTitleId: "t1" }]);
    const prisma = {
      readEvent: { findMany, groupBy, aggregate },
      readTitle: { findMany: titleFindMany },
      readListState: { findMany: listFindMany },
    } as unknown as PrismaService;
    const users = {
      resolveUser: vi.fn().mockResolvedValue({ id: "user-1" }),
    } as unknown as UsersService;
    const service = new ReadAnalyticsService(prisma, users);

    const stats = await service.rewindStats("user-1", "2025-01", "Asia/Kolkata");

    expect(findMany.mock.calls[0]![0].where.readAt).toEqual({
      gte: new Date("2024-12-31T18:30:00.000Z"),
      lt: new Date("2025-01-31T18:30:00.000Z"),
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ["readTitleId"],
      where: {
        userId: "user-1",
        readAt: {
          gte: new Date("2024-11-30T18:30:00.000Z"),
          lt: new Date("2024-12-31T18:30:00.000Z"),
        },
      },
      _count: { _all: true },
    });
    expect(titleFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["t2"] } },
      select: { id: true, name: true },
    });
    expect(stats.prior).toEqual({
      total: 8,
      deltaPct: -87,
      newItems: 0,
      returningItems: 1,
      coverage: true,
    });
    expect(stats.droppedOff).toEqual([{ id: "t2", name: "Vagabond", count: 5 }]);
    expect(stats.statusBreakdown).toEqual({ completed: 1, dropped: 0, repeating: 0 });
    expect(stats.monthly).toHaveLength(31);
    expect(stats.inProgress).toBe(1);
    expect(listFindMany.mock.calls[0]![0].where).toEqual({
      userId: "user-1",
      listStatus: "reading",
      readTitleId: { in: ["t1"] },
    });
  });
});
