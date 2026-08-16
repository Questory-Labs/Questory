import { beforeEach, describe, expect, it, vi } from "vitest";
import { TITLE_DETAIL_EVENTS_LIMIT } from "../../src/watch/analytics/analytics.constants";
import { AnalyticsService } from "../../src/watch/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

function eventRow(index: number) {
  return {
    id: `ev-${index}`,
    watchedAt: new Date(`2026-01-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`),
    source: "trakt",
    rating: null,
    episode: null,
  };
}

describe("AnalyticsService.titleDetail history", () => {
  const findUnique = vi.fn();
  const count = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findRating = vi.fn();
  const resolveUser = vi.fn();
  let service: AnalyticsService;

  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    findRating.mockReset();
    resolveUser.mockReset().mockResolvedValue({ id: "user-1" });

    findUnique.mockResolvedValue({
      id: "title-1",
      name: "Nobody 2",
      displayName: null,
      type: "movie",
      year: 2025,
      overview: null,
      posterUrl: null,
      imageManual: false,
      genres: [],
    });
    findFirst.mockResolvedValue(eventRow(1));
    findRating.mockResolvedValue(null);

    const prisma = {
      title: { findUnique },
      watchEvent: { count, findFirst, findMany },
      titleListState: { findFirst: findRating },
    } as unknown as PrismaService;
    const users = { resolveUser } as unknown as UsersService;
    service = new AnalyticsService(prisma, users);
  });

  it("returns the full event list instead of a recent slice", async () => {
    const rows = Array.from({ length: 60 }, (_, i) => eventRow(i + 1));
    count.mockResolvedValue(60);
    findMany.mockResolvedValue(rows);

    const result = await service.titleDetail("user-1", "title-1", "all");

    expect(result.eventCount).toBe(60);
    expect(result.recentEvents).toHaveLength(60);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", titleId: "title-1" },
        take: TITLE_DETAIL_EVENTS_LIMIT,
        orderBy: { watchedAt: "desc" },
      }),
    );
  });
});
