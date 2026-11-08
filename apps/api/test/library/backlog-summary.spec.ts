import { describe, expect, it, vi } from "vitest";
import {
  BacklogService,
  backlogHint,
  wishlistBacklogPenalty,
} from "../../src/library/backlog.service";

function row(
  over: Partial<{
    gameId: string;
    userStatus: string | null;
    playtimeForever: number;
    playtime2Weeks: number | null;
    hltbMainHours: number | null;
    hltbExtraHours: number | null;
    reviewScore: number | null;
  }> = {},
) {
  const gameId = over.gameId ?? "g1";
  return {
    gameId,
    userStatus: over.userStatus ?? "backlog",
    playtimeForever: over.playtimeForever ?? 0,
    playtime2Weeks: over.playtime2Weeks ?? null,
    game: {
      id: gameId,
      appId: 10,
      name: `Game ${gameId}`,
      headerImage: null,
      hltbMainHours: over.hltbMainHours ?? null,
      hltbExtraHours: over.hltbExtraHours ?? null,
      reviewScore: over.reviewScore ?? null,
    },
  };
}

function makeService(entries: ReturnType<typeof row>[], snapshots: unknown[] = []) {
  const prisma = {
    libraryEntry: { findMany: vi.fn().mockResolvedValue(entries) },
    playActivitySnapshot: { findMany: vi.fn().mockResolvedValue(snapshots) },
  };
  return { prisma, service: new BacklogService(prisma as never) };
}

const NOW = new Date("2026-11-07T12:00:00Z");

describe("BacklogService.summary", () => {
  it("skips null HLTB entries from hours and counts them as unknown", async () => {
    const { service } = makeService([
      row({ gameId: "a", hltbMainHours: 10, hltbExtraHours: 15 }),
      row({ gameId: "b", hltbMainHours: null }),
      row({ gameId: "c", userStatus: "shelved", hltbMainHours: 40 }),
    ]);
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.backlogHours).toEqual({ main: 10, extra: 15, unknownCount: 1 });
    expect(res.counts).toMatchObject({ backlog: 2, shelved: 1, unset: 0 });
    expect(res.nextUp.map((g) => g.gameId)).toEqual(["a", "b"]);
  });

  it("subtracts played time from remaining hours and never goes negative", async () => {
    const { service } = makeService([
      row({ gameId: "a", userStatus: "playing", hltbMainHours: 10, playtimeForever: 240 }),
      row({ gameId: "b", hltbMainHours: 5, playtimeForever: 600 }),
    ]);
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.remainingHours).toBe(6);
    expect(res.nextUp.map((g) => g.gameId)).toEqual(["b"]);
  });

  it("orders next up by shortest main story then highest review score", async () => {
    const { service } = makeService([
      row({ gameId: "long", hltbMainHours: 30, reviewScore: 99 }),
      row({ gameId: "short-low", hltbMainHours: 8, reviewScore: 60 }),
      row({ gameId: "short-high", hltbMainHours: 8, reviewScore: 90 }),
      row({ gameId: "unknown", hltbMainHours: null, reviewScore: 100 }),
    ]);
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.nextUp.map((g) => g.gameId)).toEqual([
      "short-high",
      "short-low",
      "long",
      "unknown",
    ]);
  });

  it("averages snapshot deltas over the weeks observed", async () => {
    const { service, prisma } = makeService(
      [row({ gameId: "a", hltbMainHours: 20 })],
      [
        { gameId: "a", observedAt: new Date("2026-10-26T10:00:00Z"), playtimeForever: 100 },
        { gameId: "a", observedAt: new Date("2026-10-27T10:00:00Z"), playtimeForever: 220 },
        { gameId: "b", observedAt: new Date("2026-11-03T10:00:00Z"), playtimeForever: 50 },
        { gameId: "b", observedAt: new Date("2026-11-04T10:00:00Z"), playtimeForever: 30 },
        { gameId: "b", observedAt: new Date("2026-11-05T10:00:00Z"), playtimeForever: 150 },
      ],
    );
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.avgSource).toBe("snapshots");
    expect(res.avgWeeklyHours).toBe(2);
    expect(res.weeksToClear).toBe(10);
    const args = prisma.playActivitySnapshot.findMany.mock.calls[0][0];
    expect(args.take).toBeGreaterThan(0);
    expect(args.where.observedAt.gte).toBeInstanceOf(Date);
  });

  it("divides by elapsed weeks, not just the weeks with play", async () => {
    const { service } = makeService(
      [row({ gameId: "a", hltbMainHours: 20 })],
      [
        { gameId: "a", observedAt: new Date("2026-09-19T10:00:00Z"), playtimeForever: 0 },
        { gameId: "a", observedAt: new Date("2026-11-05T10:00:00Z"), playtimeForever: 840 },
      ],
    );
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.avgWeeklyHours).toBe(1.8);
  });

  it("falls back to Steam two-week playtime when snapshots are empty", async () => {
    const { service } = makeService([
      row({ gameId: "a", hltbMainHours: 20, playtime2Weeks: 480 }),
      row({ gameId: "b", userStatus: "finished", playtime2Weeks: 240 }),
    ]);
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.avgSource).toBe("steam2weeks");
    expect(res.avgWeeklyHours).toBe(6);
    expect(res.weeksToClear).toBeCloseTo(3.3, 1);
  });

  it("returns null weeksToClear when there is no recent play", async () => {
    const { service } = makeService([row({ gameId: "a", hltbMainHours: 20 })]);
    const res = await service.summary("u1", "UTC", NOW);
    expect(res.avgSource).toBe("none");
    expect(res.avgWeeklyHours).toBe(0);
    expect(res.weeksToClear).toBeNull();
  });
});

describe("wishlist backlog helpers", () => {
  it("caps the wishlist penalty at 20", () => {
    const many = Array.from({ length: 35 }, () => ({
      userStatus: "backlog",
      playtimeForever: 0,
    }));
    expect(wishlistBacklogPenalty(many)).toBe(20);
    expect(wishlistBacklogPenalty(many.slice(0, 3))).toBe(3);
    expect(
      wishlistBacklogPenalty([
        { userStatus: null, playtimeForever: 0 },
        { userStatus: null, playtimeForever: 90 },
        { userStatus: "finished", playtimeForever: 0 },
      ]),
    ).toBe(1);
  });

  it("sums known HLTB hours for the hint", () => {
    expect(
      backlogHint([
        { userStatus: "backlog", playtimeForever: 0, game: { hltbMainHours: 12.4 } },
        { userStatus: null, playtimeForever: 0, game: { hltbMainHours: null } },
        { userStatus: "playing", playtimeForever: 0, game: { hltbMainHours: 50 } },
      ]),
    ).toEqual({ count: 2, hours: 12 });
  });
});
