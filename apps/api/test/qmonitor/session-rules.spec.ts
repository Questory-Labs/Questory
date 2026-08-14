import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QmonitorIngestService } from "../../src/qmonitor/qmonitor-ingest.service";
import { QmonitorSessionRulesService } from "../../src/qmonitor/qmonitor-session-rules.service";
import { QmonitorSessionsService } from "../../src/qmonitor/qmonitor-sessions.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { GameMergeService } from "../../src/stores/game-merge.service";

const endedAt = new Date("2026-01-01T01:00:00.000Z");
const startedAt = new Date("2026-01-01T00:00:00.000Z");

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ps1",
    userId: "user-1",
    title: "Dota 2",
    source: "steam",
    appId: null,
    gameId: null,
    startedAt,
    endedAt,
    durationSecs: 3600,
    exe: "dota2.exe",
    hostOs: "windows",
    hostName: "pc",
    ...overrides,
  };
}

describe("QmonitorSessionRulesService", () => {
  const playSessionFindFirst = vi.fn();
  const playSessionFindMany = vi.fn();
  const playSessionUpdateMany = vi.fn();
  const playSessionDeleteMany = vi.fn();
  const libraryEntryFindUnique = vi.fn();
  const libraryEntryFindMany = vi.fn();
  const libraryEntryUpdate = vi.fn();
  const userPlaySessionRuleFindMany = vi.fn();
  const userPlaySessionRuleUpsert = vi.fn();

  let rules: QmonitorSessionRulesService;
  let sessions: QmonitorSessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    userPlaySessionRuleFindMany.mockResolvedValue([]);
    playSessionUpdateMany.mockResolvedValue({ count: 0 });
    playSessionDeleteMany.mockResolvedValue({ count: 0 });
    libraryEntryUpdate.mockResolvedValue({});

    const prisma = {
      playSession: {
        findFirst: playSessionFindFirst,
        findMany: playSessionFindMany,
        updateMany: playSessionUpdateMany,
        deleteMany: playSessionDeleteMany,
      },
      libraryEntry: {
        findUnique: libraryEntryFindUnique,
        findMany: libraryEntryFindMany,
        update: libraryEntryUpdate,
      },
      userPlaySessionRule: {
        findMany: userPlaySessionRuleFindMany,
        upsert: userPlaySessionRuleUpsert,
      },
    } as unknown as PrismaService;

    rules = new QmonitorSessionRulesService(prisma);
    sessions = new QmonitorSessionsService(prisma);
  });

  it("suggests library games for the user", async () => {
    libraryEntryFindMany.mockResolvedValue([
      {
        game: {
          id: "g1",
          name: "Dota 2",
          headerImage: null,
          appId: 570,
        },
      },
    ]);
    const result = await rules.suggestLibraryGames("user-1", "dota");
    expect(result.items).toEqual([
      { gameId: "g1", name: "Dota 2", headerImage: null, appId: 570 },
    ]);
  });

  it("previews similar sessions by exe", async () => {
    playSessionFindFirst.mockResolvedValue(sessionRow());
    playSessionFindMany.mockResolvedValue([
      sessionRow(),
      sessionRow({ id: "ps2", title: "Dota 2 - DirectX 11", exe: "Dota2.exe" }),
      sessionRow({ id: "ps3", exe: "hl2.exe", title: "Half-Life 2" }),
    ]);
    const result = await rules.similar("user-1", "ps1");
    expect(result).toEqual({
      count: 2,
      matchKind: "exe",
      matchValue: "dota2.exe",
    });
  });

  it("assigns similar sessions, upserts a user rule, and bumps lastPlayedAt", async () => {
    playSessionFindFirst.mockResolvedValue(sessionRow());
    libraryEntryFindUnique
      .mockResolvedValueOnce({
        game: { id: "g1", appId: 570 },
      })
      .mockResolvedValueOnce({
        id: "le1",
        lastPlayedAt: null,
      });
    userPlaySessionRuleUpsert.mockResolvedValue({ id: "rule-1" });
    playSessionFindMany.mockResolvedValue([
      sessionRow(),
      sessionRow({ id: "ps2", exe: "dota2.exe", endedAt }),
    ]);
    playSessionUpdateMany.mockResolvedValue({ count: 2 });

    const result = await rules.assign("user-1", "ps1", "g1");
    expect(result).toEqual({
      ok: true,
      assignedCount: 2,
      ruleId: "rule-1",
    });
    expect(userPlaySessionRuleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_matchKey: { userId: "user-1", matchKey: "exe:dota2.exe" } },
        create: expect.objectContaining({
          targetGameId: "g1",
          matchKey: "exe:dota2.exe",
        }),
      }),
    );
    expect(playSessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["ps1", "ps2"] } },
      data: { gameId: "g1", appId: 570 },
    });
    expect(libraryEntryUpdate).toHaveBeenCalledWith({
      where: { id: "le1" },
      data: { lastPlayedAt: endedAt },
    });
  });

  it("merges title-only sessions when exe is missing", async () => {
    playSessionFindFirst.mockResolvedValue(
      sessionRow({ exe: null, title: "Cool Game" }),
    );
    libraryEntryFindUnique.mockResolvedValue({
      id: "le2",
      lastPlayedAt: endedAt,
      game: { id: "g2", appId: 440 },
    });
    userPlaySessionRuleUpsert.mockResolvedValue({ id: "rule-2" });
    playSessionFindMany.mockResolvedValue([
      sessionRow({ id: "ps1", exe: null, title: "cool game" }),
      sessionRow({ id: "ps2", exe: "other.exe", title: "Cool Game" }),
    ]);

    const result = await rules.assign("user-1", "ps1", "g2");
    expect(result.assignedCount).toBe(1);
    expect(playSessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["ps1"] } },
      data: { gameId: "g2", appId: 440 },
    });
  });

  it("rejects assign when the game is not in the library", async () => {
    playSessionFindFirst.mockResolvedValue(sessionRow());
    libraryEntryFindUnique.mockResolvedValue(null);
    await expect(rules.assign("user-1", "ps1", "g-missing")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userPlaySessionRuleUpsert).not.toHaveBeenCalled();
  });

  it("404s when the session is not the user's", async () => {
    playSessionFindFirst.mockResolvedValue(null);
    await expect(rules.similar("user-1", "ps-missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("resolves ingest targets from cached user rules", async () => {
    userPlaySessionRuleFindMany.mockResolvedValue([
      {
        matchKey: "exe:dota2.exe",
        targetGameId: "g1",
        targetGame: { appId: 570 },
      },
    ]);
    await expect(
      rules.resolveTarget("user-1", "Dota 2", "dota2.exe"),
    ).resolves.toEqual({ gameId: "g1", appId: 570 });
    await expect(
      rules.resolveTarget("user-1", "Half-Life 2", "hl2.exe"),
    ).resolves.toBeNull();
  });

  it("deletes only the caller's session", async () => {
    playSessionDeleteMany.mockResolvedValue({ count: 1 });
    await expect(sessions.remove("user-1", "ps1")).resolves.toEqual({
      ok: true,
    });
    playSessionDeleteMany.mockResolvedValue({ count: 0 });
    await expect(sessions.remove("user-1", "ps1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("QmonitorIngestService rules", () => {
  it("applies a user rule before steam_app_id mapping", async () => {
    const upsertListing = vi.fn();
    const playSessionUpsert = vi.fn().mockResolvedValue({ id: "ps1" });
    const libraryEntryFindUnique = vi.fn().mockResolvedValue(null);
    const resolveTarget = vi.fn().mockResolvedValue({
      gameId: "g-rule",
      appId: 440,
    });

    const ingest = new QmonitorIngestService(
      {
        playSession: { upsert: playSessionUpsert },
        libraryEntry: { findUnique: libraryEntryFindUnique, update: vi.fn() },
      } as unknown as PrismaService,
      { upsertListing } as unknown as GameMergeService,
      { resolveTarget } as unknown as QmonitorSessionRulesService,
    );

    await ingest.ingest("user-1", {
      schema_version: 1,
      session_id: "s1",
      source: "steam",
      steam_app_id: 570,
      title: "Dota 2",
      exe: "dota2.exe",
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_secs: 3600,
      host: { os: "windows", hostname: "pc" },
    });

    expect(upsertListing).not.toHaveBeenCalled();
    expect(playSessionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          gameId: "g-rule",
          appId: 440,
        }),
      }),
    );
  });
});
