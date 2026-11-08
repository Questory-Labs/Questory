import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { hashApiToken } from "../../src/accounts/accounts.service";
import { CacheService } from "../../src/cache/cache.service";
import {
  RewindShareService,
  escapeXml,
  renderBadgeSvg,
} from "../../src/rewind/rewind-share.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { MonthlyRecapService } from "../../src/recap/monthly-recap.service";

const OWNER = { personaName: "Ada <script>", avatarUrl: null };

function makeDeps() {
  const rows = new Map<string, any>();
  const create = vi.fn().mockImplementation(async ({ data }) => {
    const row = {
      id: `s${rows.size + 1}`,
      snapshot: "{}",
      theme: null,
      period: "",
      viewCount: 0,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      revokedAt: null,
      ...data,
    };
    rows.set(row.tokenHash, row);
    return row;
  });
  const findUnique = vi.fn().mockImplementation(async ({ where }) => {
    const row = rows.get(where.tokenHash);
    return row ? { ...row, user: OWNER } : null;
  });
  const updateMany = vi.fn().mockImplementation(async ({ where, data }) => {
    let count = 0;
    for (const row of rows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.userId && row.userId !== where.userId) continue;
      if (where.kind && row.kind !== where.kind) continue;
      if (where.revokedAt === null && row.revokedAt) continue;
      count += 1;
      if (data.viewCount?.increment) row.viewCount += data.viewCount.increment;
      if (data.revokedAt) row.revokedAt = data.revokedAt;
    }
    return { count };
  });
  const findMany = vi.fn().mockImplementation(async ({ where }) =>
    [...rows.values()].filter(
      (r) => r.userId === where.userId && r.kind === where.kind && !r.revokedAt,
    ),
  );
  const count = vi.fn().mockImplementation(async ({ where }) =>
    [...rows.values()].filter(
      (r) => r.userId === where.userId && r.kind === where.kind && !r.revokedAt,
    ).length,
  );
  const aiFindUnique = vi.fn().mockResolvedValue(null);
  const playSessionFindFirst = vi.fn().mockResolvedValue(null);
  const libraryFindFirst = vi.fn().mockResolvedValue(null);
  const prisma = {
    rewindShare: { create, findUnique, updateMany, findMany, count },
    aiInsightCache: { findUnique: aiFindUnique },
    playSession: { findFirst: playSessionFindFirst },
    libraryEntry: { findFirst: libraryFindFirst },
  } as unknown as PrismaService;
  const statsForDomain = vi.fn().mockResolvedValue({
    domain: "games",
    period: "2026-09",
    totalMinutes: 120,
  });
  const recap = { statsForDomain } as unknown as MonthlyRecapService;
  return {
    service: new RewindShareService(prisma, recap, new CacheService()),
    rows,
    create,
    statsForDomain,
    aiFindUnique,
    playSessionFindFirst,
    libraryFindFirst,
  };
}

describe("RewindShareService", () => {
  beforeEach(() => {
    process.env.PUBLIC_WEB_URL = "https://q.example";
    process.env.PUBLIC_API_URL = "https://api.example";
  });
  afterEach(() => {
    delete process.env.PUBLIC_WEB_URL;
    delete process.env.PUBLIC_API_URL;
    vi.clearAllMocks();
  });

  it("stores only the token hash and a frozen snapshot", async () => {
    const d = makeDeps();
    const created = await d.service.createShare("u1", {
      domain: "games",
      period: "2026-09",
      includeAi: false,
    });
    expect(created.token).toHaveLength(43);
    expect(created.url).toBe(`https://q.example/share/rewind/${created.token}`);
    const data = d.create.mock.calls[0]![0].data;
    expect(data.tokenHash).toBe(hashApiToken(created.token));
    expect(JSON.stringify(data)).not.toContain(created.token);
    expect(JSON.parse(data.snapshot)).toEqual({
      stats: { domain: "games", period: "2026-09", totalMinutes: 120 },
      ai: null,
    });
    expect(d.statsForDomain).toHaveBeenCalledWith("games", "u1", "2026-09", "UTC");
  });

  it("includes cached AI text only when asked", async () => {
    const d = makeDeps();
    d.aiFindUnique.mockResolvedValue({
      content: "<topgame>Factorio</topgame>",
      updatedAt: new Date("2026-10-02T00:00:00Z"),
    });
    const created = await d.service.createShare("u1", {
      domain: "all",
      period: "2026",
      includeAi: true,
    });
    expect(created.includesAi).toBe(true);
    const pub = await d.service.resolveShare(created.token);
    expect(pub.ai).toEqual({
      content: "<topgame>Factorio</topgame>",
      generatedAt: "2026-10-02T00:00:00.000Z",
    });
    expect(pub.owner).toEqual(OWNER);
    expect(JSON.stringify(pub)).not.toContain("u1");
  });

  it("serves the snapshot even after live stats change and counts views", async () => {
    const d = makeDeps();
    const created = await d.service.createShare("u1", {
      domain: "games",
      period: "2026-09",
      includeAi: false,
    });
    d.statsForDomain.mockResolvedValue({ domain: "games", period: "2026-09", totalMinutes: 999 });
    const first = await d.service.resolveShare(created.token, { countView: true });
    const second = await d.service.resolveShare(created.token, { countView: true });
    await d.service.resolveShare(created.token);
    expect((first.stats as { totalMinutes: number }).totalMinutes).toBe(120);
    expect((second.stats as { totalMinutes: number }).totalMinutes).toBe(120);
    const [share] = await d.service.listShares("u1");
    expect(share!.viewCount).toBe(2);
    expect(share!.url).not.toContain(created.token);
  });

  it("caps active shares and badges per user", async () => {
    const d = makeDeps();
    for (let i = 0; i < 10; i += 1) await d.service.createBadge("u1");
    await expect(d.service.createBadge("u1")).rejects.toBeInstanceOf(BadRequestException);
    const [first] = await d.service.listBadges("u1");
    await d.service.revokeBadge("u1", first!.id);
    await expect(d.service.createBadge("u1")).resolves.toBeDefined();
    await expect(d.service.createBadge("u2")).resolves.toBeDefined();
  });

  it("rejects unknown, malformed, wrong-kind and revoked tokens", async () => {
    const d = makeDeps();
    const created = await d.service.createShare("u1", {
      domain: "games",
      period: "2026-09",
      includeAi: false,
    });
    const badge = await d.service.createBadge("u1");
    await expect(d.service.resolveShare("nope")).rejects.toBeInstanceOf(NotFoundException);
    await expect(d.service.resolveShare("a".repeat(43))).rejects.toBeInstanceOf(NotFoundException);
    await expect(d.service.resolveShare(badge.token)).rejects.toBeInstanceOf(NotFoundException);
    await expect(d.service.resolveBadge(created.token)).rejects.toBeInstanceOf(NotFoundException);
    await expect(d.service.revokeShare("u2", created.id)).rejects.toBeInstanceOf(NotFoundException);
    await d.service.revokeShare("u1", created.id);
    await expect(d.service.resolveShare(created.token)).rejects.toBeInstanceOf(NotFoundException);
    expect(await d.service.listShares("u1")).toEqual([]);
  });

  it("renders an escaped badge from the latest session, falling back to the library", async () => {
    const d = makeDeps();
    const badge = await d.service.createBadge("u1");
    expect(badge.svgUrl).toBe(`https://api.example/v1/share/badge/${badge.token}.svg`);
    expect(badge.markdown).toContain(badge.svgUrl);
    d.libraryFindFirst.mockResolvedValue({ game: { name: "Half-Life <2> & \"Ep\"" } });
    const fromLibrary = await d.service.resolveBadge(badge.token);
    expect(fromLibrary).toContain("Half-Life &lt;2&gt; &amp; &quot;Ep&quot;");
    expect(fromLibrary).toContain("LAST PLAYED · Ada &lt;script&gt;");
    expect(fromLibrary).not.toContain("<script>");
    d.libraryFindFirst.mockResolvedValue({
      lastPlayedAt: new Date("2026-10-01T00:00:00Z"),
      game: { name: "Old Library Game" },
    });
    d.playSessionFindFirst.mockResolvedValue({
      title: "Factorio",
      endedAt: new Date("2026-10-05T00:00:00Z"),
      game: null,
    });
    const newer = await d.service.resolveBadge(badge.token);
    expect(newer).toContain(">Factorio<");
    expect(newer).not.toContain("NOW PLAYING");
    d.playSessionFindFirst.mockResolvedValue({
      title: "Stale",
      endedAt: new Date("2026-09-01T00:00:00Z"),
      game: null,
    });
    expect(await d.service.resolveBadge(badge.token)).toContain(">Old Library Game<");
    const sessionWhere = d.playSessionFindFirst.mock.calls[0]![0].where;
    expect(sessionWhere.OR).toContainEqual({
      game: { libraryEntries: { none: { userId: "u1", hidden: true } } },
    });
    expect(d.libraryFindFirst.mock.calls[0]![0].where).toMatchObject({ userId: "u1", hidden: false });
  });
});

describe("badge svg helpers", () => {
  it("escapes xml specials", () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });

  it("clips long titles and handles no game", () => {
    const svg = renderBadgeSvg({ personaName: "P", gameTitle: "x".repeat(80) });
    expect(svg).toContain(`${"x".repeat(47)}…`);
    expect(renderBadgeSvg({ personaName: "P", gameTitle: null })).toContain("Nothing yet");
  });
});
