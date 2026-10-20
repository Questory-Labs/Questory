import { describe, expect, it, vi } from "vitest";
import { GamesRewindService } from "../../src/games/rewind/games-rewind.service";
import {
  countNewGames,
  countUnlocksInPeriod,
  normalizeSessions,
  sessionShape,
  snapshotMinuteEvents,
} from "../../src/games/rewind/games-rewind-stats";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { SteamApiService } from "../../src/steam/steam-api.service";
import type { AccountsService } from "../../src/accounts/accounts.service";

const hades = { name: "Hades II", headerImage: "h.jpg", genres: '["Roguelike","Action"]' };

const session = (
  gameId: string | null,
  startIso: string,
  minutes: number,
  title = "Hades II",
) => ({
  gameId,
  title,
  startedAt: new Date(startIso),
  durationSecs: minutes * 60,
  game: gameId === "g1" ? hades : null,
});

type Data = {
  sessions?: ReturnType<typeof session>[];
  snapshots?: { gameId: string; observedAt: Date; playtimeForever: number }[];
  baseline?: { gameId: string; _max: { playtimeForever: number } }[];
  earliestSession?: Date | null;
  earliestSnapshot?: Date | null;
  hidden?: string[];
  library?: { gameId: string; playtimeForever: number }[];
  owned?: number;
  unplayed?: number;
  priorSessions?: { gameId: string; _sum: { durationSecs: number } }[];
  priorCapped?: { gameId: string; _count: { _all: number } }[];
};

function makeService(data: Data) {
  const playSessionGroupBy = vi
    .fn()
    .mockImplementation(async (args: { where: { durationSecs?: { lt?: number } }; _count?: unknown }) => {
      if (!args.where.durationSecs) return [];
      return args._count ? (data.priorCapped ?? []) : (data.priorSessions ?? []);
    });
  const snapshotGroupBy = vi
    .fn()
    .mockImplementation(async (args: { where: { observedAt: { lt?: Date; gte?: Date } } }) =>
      args.where.observedAt.gte ? [] : (data.baseline ?? []),
    );
  const libraryCount = vi
    .fn()
    .mockImplementation(async (args: { where: { playtimeForever?: number } }) =>
      args.where.playtimeForever === 0 ? (data.unplayed ?? 0) : (data.owned ?? 0),
    );
  const libraryFindMany = vi
    .fn()
    .mockImplementation(async (args: { where: { hidden?: boolean; gameId?: unknown } }) => {
      if (args.where.hidden === true) {
        return (data.hidden ?? []).map((gameId) => ({ gameId }));
      }
      if (args.where.gameId) return data.library ?? [];
      return [];
    });
  const prisma = {
    libraryEntry: { findMany: libraryFindMany, count: libraryCount },
    playSession: {
      findMany: vi.fn().mockResolvedValue(data.sessions ?? []),
      groupBy: playSessionGroupBy,
      aggregate: vi.fn().mockResolvedValue({ _min: { startedAt: data.earliestSession ?? null } }),
    },
    playActivitySnapshot: {
      findMany: vi.fn().mockResolvedValue(data.snapshots ?? []),
      groupBy: snapshotGroupBy,
      aggregate: vi
        .fn()
        .mockResolvedValue({ _min: { observedAt: data.earliestSnapshot ?? null } }),
    },
    game: {
      findMany: vi.fn().mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
        args.where.id.in
          .filter((id) => id === "g1" || id === "g2")
          .map((id) =>
            id === "g1"
              ? { id, ...hades, appId: 1145350 }
              : { id, name: "Balatro", headerImage: null, genres: '["Card"]', appId: 2379780 },
          ),
      ),
    },
  } as unknown as PrismaService;
  const steam = {
    getPlayerAchievements: vi.fn().mockResolvedValue({
      unlocked: 3,
      total: 10,
      pct: 30,
      unlockTimes: [
        Date.UTC(2024, 11, 31) / 1000,
        Date.UTC(2025, 4, 1) / 1000,
        Date.UTC(2025, 5, 1) / 1000,
      ],
    }),
  } as unknown as SteamApiService;
  const accounts = {
    getSteamId: vi.fn().mockResolvedValue("7656"),
  } as unknown as AccountsService;
  return { service: new GamesRewindService(prisma, steam, accounts), prisma, steam };
}

describe("GamesRewindService.rewindStats", () => {
  it("builds shape and volume from sessions only", async () => {
    const { service, steam } = makeService({
      sessions: [
        session("g1", "2025-03-01T21:00:00Z", 360),
        session("g1", "2025-03-02T10:00:00Z", 60),
        session(null, "2025-03-03T10:00:00Z", 45, "Some Emulator"),
        session("g1", "2025-03-04T10:00:00Z", 2),
      ],
      earliestSession: new Date("2025-02-01T00:00:00Z"),
      library: [{ gameId: "g1", playtimeForever: 500 }],
      owned: 30,
      unplayed: 12,
    });
    const stats = await service.rewindStats("u1", "2025", "UTC");
    expect(stats.sessions).toBe(3);
    expect(stats.sessionsAvailable).toBe(true);
    expect(stats.totalMinutes).toBe(465);
    expect(stats.uniqueGames).toBe(2);
    expect(stats.topGames.map((g) => [g.name, g.count])).toEqual([
      ["Hades II", 420],
      ["Some Emulator", 45],
    ]);
    expect(stats.topGenres[0]).toEqual({ id: "roguelike", name: "Roguelike", count: 420 });
    expect(stats.longestSession).toEqual({ name: "Hades II", minutes: 360, date: "2025-03-01" });
    expect(stats.lateNightShare).toBe(Math.round((300 / 465) * 100));
    expect(stats.peakHour?.label).toBe("10am");
    expect(stats.newGames).toBe(1);
    expect(stats.backlog).toBe(12);
    expect(stats.longestStreakDays).toBe(3);
    expect(stats.monthly).toHaveLength(12);
    expect(stats.monthly?.[2]).toEqual({ month: "2025-03", count: 465, topItem: "Hades II" });
    expect(stats.prior?.coverage).toBe(false);
    expect(stats.droppedOff).toEqual([]);
    expect(stats.achievementsInPeriod).toBe(2);
    expect(steam.getPlayerAchievements).toHaveBeenCalledWith("7656", 1145350);
  });

  it("uses snapshot deltas from the baseline when there are no sessions", async () => {
    const { service } = makeService({
      snapshots: [
        { gameId: "g2", observedAt: new Date("2025-01-10T00:00:00Z"), playtimeForever: 1100 },
        { gameId: "g2", observedAt: new Date("2025-02-10T00:00:00Z"), playtimeForever: 1300 },
      ],
      baseline: [{ gameId: "g2", _max: { playtimeForever: 1000 } }],
      earliestSnapshot: new Date("2023-01-01T00:00:00Z"),
    });
    const stats = await service.rewindStats("u1", "2025", "UTC");
    expect(stats.sessionsAvailable).toBe(false);
    expect(stats.sessions).toBe(0);
    expect(stats.totalMinutes).toBe(300);
    expect(stats.topGames).toEqual([
      { id: "g2", name: "Balatro", count: 300, imageUrl: null },
    ]);
    expect(stats.peakHour).toBeNull();
    expect(stats.lateNightShare).toBeNull();
    expect(stats.longestSession).toBeNull();
    expect(stats.newGames).toBe(0);
    expect(stats.backlog).toBeNull();
    expect(stats.monthly?.[0]?.count).toBe(100);
    expect(stats.monthly?.[1]?.count).toBe(200);
    expect(stats.prior?.coverage).toBe(true);
  });

  it("takes the larger source per game when both exist", async () => {
    const { service } = makeService({
      sessions: [session("g1", "2025-05-01T10:00:00Z", 60)],
      snapshots: [
        { gameId: "g1", observedAt: new Date("2025-05-02T00:00:00Z"), playtimeForever: 400 },
      ],
      baseline: [{ gameId: "g1", _max: { playtimeForever: 200 } }],
      earliestSession: new Date("2025-05-01T00:00:00Z"),
    });
    const stats = await service.rewindStats("u1", "2025", "UTC");
    expect(stats.totalMinutes).toBe(200);
    expect(stats.sessions).toBe(1);
    expect(stats.newGames).toBe(0);
  });

  it("returns an empty, honest shape with no data and hides hidden games", async () => {
    const { service } = makeService({
      sessions: [session("g1", "2025-05-01T10:00:00Z", 60)],
      hidden: ["g1"],
    });
    const stats = await service.rewindStats("u1", "2025-05", "UTC");
    expect(stats.totalMinutes).toBe(0);
    expect(stats.topGames).toEqual([]);
    expect(stats.sessionsAvailable).toBe(false);
    expect(stats.achievementsInPeriod).toBeNull();
    expect(stats.monthly).toHaveLength(31);
    expect(stats.abandoned).toBeUndefined();
  });
});

describe("games rewind helpers", () => {
  it("normalizes prior-period sessions like the current period", async () => {
    const { service, prisma } = makeService({
      sessions: [session("g1", "2025-03-01T21:00:00Z", 60)],
      earliestSession: new Date("2023-01-01T00:00:00Z"),
      priorSessions: [{ gameId: "g1", _sum: { durationSecs: 30 * 60 } }],
      priorCapped: [{ gameId: "g1", _count: { _all: 1 } }],
    });
    const stats = await service.rewindStats("u1", "2025", "UTC");
    expect(stats.prior?.total).toBe(30 + 16 * 60);
    const snapshotArgs = vi.mocked(prisma.playActivitySnapshot.findMany).mock.calls[0]?.[0];
    expect(snapshotArgs).toMatchObject({ orderBy: { observedAt: "asc" } });
  });

  it("floors short sessions and caps runaway ones", () => {
    const out = normalizeSessions([
      session("g1", "2025-01-01T00:00:00Z", 3),
      session("g1", "2025-01-01T00:00:00Z", 20 * 60),
    ]);
    expect(out.map((s) => s.minutes)).toEqual([16 * 60]);
  });

  it("weights late night by minutes in the local zone", () => {
    const sessions = normalizeSessions([session("g1", "2025-01-01T16:00:00Z", 120)]);
    const shape = sessionShape(sessions, "Asia/Kolkata");
    expect(shape.lateNightShare).toBe(75);
    expect(shape.peakHour?.index).toBe(22);
  });

  it("never credits the first snapshot without a baseline", () => {
    const events = snapshotMinuteEvents(
      [{ gameId: "g1", observedAt: new Date("2025-01-01T00:00:00Z"), playtimeForever: 9000 }],
      new Map(),
      new Map(),
      "UTC",
    );
    expect(events).toEqual([]);
  });

  it("counts new games against lifetime playtime", () => {
    expect(
      countNewGames({
        minutes: new Map([
          ["a", 100],
          ["b", 100],
          ["c", 100],
        ]),
        playedBefore: new Set(["c"]),
        lifetime: new Map([
          ["a", 120],
          ["b", 900],
        ]),
      }),
    ).toBe(1);
  });

  it("counts unlocks inside the period only", () => {
    expect(
      countUnlocksInPeriod(
        [100, 200, 300],
        new Date(150_000),
        new Date(300_000),
      ),
    ).toBe(1);
  });
});
