import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../../src/watch/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("AnalyticsService.recent pagination", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const resolveUser = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    resolveUser.mockReset().mockResolvedValue({ id: "user-1" });
    const prisma = {
      watchEvent: { count, findMany },
    } as unknown as PrismaService;
    const users = { resolveUser } as unknown as UsersService;
    service = new AnalyticsService(prisma, users);
  });

  it("returns total/page/pageSize and skips to the requested page", async () => {
    count.mockResolvedValue(95);
    findMany.mockResolvedValue([
      {
        id: "ev-41",
        watchedAt: new Date("2026-07-01T12:00:00.000Z"),
        source: "trakt",
        precision: "exact",
        title: {
          id: "t1",
          name: "Show",
          type: "show",
          posterUrl: null,
          genres: [],
        },
        episode: null,
      },
    ]);

    const result = await service.recent("user-1", 2, 40);

    expect(result).toMatchObject({
      total: 95,
      page: 2,
      pageSize: 40,
    });
    expect(result.items).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        skip: 40,
        take: 40,
        orderBy: { watchedAt: "desc" },
      }),
    );
  });

  it("clamps pageSize to 100", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const result = await service.recent("user-1", 1, 500);

    expect(result.pageSize).toBe(100);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, skip: 0 }),
    );
  });
});
