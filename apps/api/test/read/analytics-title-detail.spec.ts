import { beforeEach, describe, expect, it, vi } from "vitest";
import { TITLE_DETAIL_EVENTS_LIMIT } from "../../src/read/analytics/analytics.constants";
import { ReadAnalyticsService } from "../../src/read/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

function eventRow(index: number) {
  return {
    id: `ev-${index}`,
    readAt: new Date(
      `2026-01-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    ),
    source: "anilist",
    status: "reading",
    chaptersRead: index,
    volumesRead: 1,
  };
}

describe("Read AnalyticsService.titleDetail history", () => {
  const findUnique = vi.fn();
  const count = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findListState = vi.fn();
  const resolveUser = vi.fn();
  let service: ReadAnalyticsService;

  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    findListState.mockReset();
    resolveUser.mockReset().mockResolvedValue({ id: "user-1" });

    findUnique.mockResolvedValue({
      id: "title-1",
      name: "Berserk",
      displayName: null,
      format: "manga",
      year: 1989,
      overview: null,
      coverUrl: null,
      imageManual: false,
      publishingStatus: "releasing",
      chapters: null,
      volumes: null,
      genres: [],
    });
    findFirst.mockResolvedValue(eventRow(1));
    findListState.mockResolvedValue({ listStatus: "reading" });

    const prisma = {
      readTitle: { findUnique },
      readEvent: { count, findFirst, findMany },
      readListState: { findFirst: findListState },
    } as unknown as PrismaService;
    const users = { resolveUser } as unknown as UsersService;
    service = new ReadAnalyticsService(prisma, users);
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
        where: { userId: "user-1", readTitleId: "title-1" },
        take: TITLE_DETAIL_EVENTS_LIMIT,
        orderBy: { readAt: "desc" },
      }),
    );
  });
});
