import { describe, expect, it, beforeEach, vi } from "vitest";
import { QmonitorSessionStatsService } from "../../src/qmonitor/qmonitor-session-stats.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const now = new Date("2026-01-15T12:00:00.000Z");

function windowRow(overrides: Record<string, unknown> = {}) {
  return {
    endedAt: new Date("2026-01-15T11:00:00.000Z"),
    durationSecs: 3600,
    gameId: "g1",
    title: "Dota 2",
    game: {
      id: "g1",
      name: "Dota 2",
      headerImage: "https://example.com/h.jpg",
      appId: 570,
    },
    ...overrides,
  };
}

describe("QmonitorSessionStatsService", () => {
  const aggregate = vi.fn();
  const count = vi.fn();
  const groupBy = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  let service: QmonitorSessionStatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _sum: { durationSecs: 10800 },
      _avg: { durationSecs: 3600 },
    });
    count.mockResolvedValue(1);
    groupBy.mockResolvedValue([{ gameId: "g1", _count: { _all: 2 } }]);
    findFirst.mockResolvedValue({ endedAt: now });
    findMany.mockResolvedValue([
      windowRow(),
      windowRow({
        endedAt: new Date("2026-01-14T12:00:00.000Z"),
        durationSecs: 1800,
        gameId: "g2",
        title: "Hades",
        game: {
          id: "g2",
          name: "Hades",
          headerImage: null,
          appId: 1145360,
        },
      }),
      windowRow({
        endedAt: new Date("2025-12-01T12:00:00.000Z"),
        durationSecs: 7200,
        gameId: "g-old",
        title: "Old",
        game: { id: "g-old", name: "Old", headerImage: null, appId: 1 },
      }),
    ]);

    service = new QmonitorSessionStatsService({
      playSession: { aggregate, count, groupBy, findFirst, findMany },
    } as unknown as PrismaService);
  });

  it("rolls all-time totals and a 14-day local series", async () => {
    const stats = await service.stats("user-1", "UTC", now);

    expect(stats.sessionCount).toBe(3);
    expect(stats.totalDurationSecs).toBe(10800);
    expect(stats.avgDurationSecs).toBe(3600);
    expect(stats.unmatchedCount).toBe(1);
    expect(stats.uniqueGames).toBe(1);
    expect(stats.lastPlayedAt).toBe(now.toISOString());
    expect(stats.windowDays).toBe(14);
    expect(stats.weekDays).toBe(7);
    expect(stats.byDay).toHaveLength(14);
    expect(stats.byDay[0]?.day).toBe("2026-01-02");
    expect(stats.byDay.at(-1)).toEqual({
      day: "2026-01-15",
      durationSecs: 3600,
      sessionCount: 1,
    });
    expect(stats.byDay.at(-2)).toEqual({
      day: "2026-01-14",
      durationSecs: 1800,
      sessionCount: 1,
    });
    expect(stats.weekDurationSecs).toBe(5400);
    expect(stats.weekSessionCount).toBe(2);
    expect(stats.topGames.map((g) => g.name)).toEqual(["Dota 2", "Hades"]);
    expect(findMany.mock.calls[0]?.[0]?.where).toEqual({
      userId: "user-1",
      endedAt: { gte: expect.any(Date) },
    });
  });

  it("keeps unmatched titles in the top list", async () => {
    findMany.mockResolvedValue([
      windowRow({
        gameId: null,
        title: "Unknown.exe",
        game: null,
        durationSecs: 9000,
      }),
    ]);

    const stats = await service.stats("user-1", "UTC", now);
    expect(stats.topGames).toEqual([
      {
        key: "title:Unknown.exe",
        gameId: null,
        name: "Unknown.exe",
        headerImage: null,
        appId: null,
        durationSecs: 9000,
        sessionCount: 1,
      },
    ]);
  });

  it("returns zeroed buckets when there are no sessions", async () => {
    aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { durationSecs: null },
      _avg: { durationSecs: null },
    });
    count.mockResolvedValue(0);
    groupBy.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
    findMany.mockResolvedValue([]);

    const stats = await service.stats("user-1", "UTC", now);
    expect(stats.sessionCount).toBe(0);
    expect(stats.totalDurationSecs).toBe(0);
    expect(stats.avgDurationSecs).toBe(0);
    expect(stats.lastPlayedAt).toBeNull();
    expect(stats.byDay.every((d) => d.durationSecs === 0)).toBe(true);
    expect(stats.topGames).toEqual([]);
  });
});
