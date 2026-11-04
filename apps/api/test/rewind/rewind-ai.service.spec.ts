import { afterEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { RewindAiService } from "../../src/rewind/rewind-ai.service";
import { parseRewindQuery } from "../../src/rewind/rewind-query";
import type { PrismaService } from "../../src/prisma/prisma.service";

vi.mock("../../src/lib/rewind-ai-client", () => ({
  callRewindGenerate: vi.fn(),
}));

import { callRewindGenerate } from "../../src/lib/rewind-ai-client";

const generate = vi.mocked(callRewindGenerate);

function makePrisma(cached: { content: string; updatedAt: Date } | null) {
  const findUnique = vi.fn().mockResolvedValue(cached);
  const upsert = vi.fn().mockImplementation(async ({ create }) => ({
    content: create.content,
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  }));
  return {
    prisma: { aiInsightCache: { findUnique, upsert } } as unknown as PrismaService,
    findUnique,
    upsert,
  };
}

describe("RewindAiService", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the cached insight without loading stats", async () => {
    const { prisma } = makePrisma({
      content: "<topgame>cached</topgame>",
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const loadStats = vi.fn();
    const out = await new RewindAiService(prisma).serve({
      userId: "u1",
      domain: "games",
      period: "2025",
      forceRedo: false,
      loadStats,
    });
    expect(out).toEqual({
      period: "2025",
      content: "<topgame>cached</topgame>",
      generatedAt: "2026-01-01T00:00:00.000Z",
      cached: true,
    });
    expect(loadStats).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("regenerates on forceRedo and upserts under the domain key", async () => {
    const { prisma, findUnique, upsert } = makePrisma({
      content: "old",
      updatedAt: new Date(),
    });
    generate.mockResolvedValue("<topgame>fresh</topgame>");
    const stats = { domain: "games", totalMinutes: 60 };
    const out = await new RewindAiService(prisma).serve({
      userId: "u1",
      domain: "games",
      period: "2025",
      forceRedo: true,
      loadStats: async () => stats,
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledWith("u1", "games", "2025", stats);
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_domain_period: { userId: "u1", domain: "games", period: "2025" } },
      create: { userId: "u1", domain: "games", period: "2025", content: "<topgame>fresh</topgame>" },
      update: { content: "<topgame>fresh</topgame>" },
    });
    expect(out.cached).toBe(false);
  });

  it("surfaces generation failures as a 400 and stores nothing", async () => {
    const { prisma, upsert } = makePrisma(null);
    generate.mockRejectedValue(new Error("qengine down"));
    await expect(
      new RewindAiService(prisma).serve({
        userId: "u1",
        domain: "music",
        period: "2025",
        forceRedo: false,
        loadStats: async () => ({}),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("stores the fallback string the client returns for empty output", async () => {
    const { prisma, upsert } = makePrisma(null);
    generate.mockResolvedValue("fallback text");
    const out = await new RewindAiService(prisma).serve({
      userId: "u1",
      domain: "watch",
      period: "2025",
      forceRedo: false,
      loadStats: async () => ({}),
    });
    expect(out.content).toBe("fallback text");
    expect(upsert).toHaveBeenCalledOnce();
  });
});

describe("parseRewindQuery", () => {
  it("validates period, zone and forceRedo", () => {
    expect(parseRewindQuery({ period: "2025-03", tz: "Asia/Kolkata", forceRedo: "true" })).toEqual({
      period: "2025-03",
      timeZone: "Asia/Kolkata",
      forceRedo: true,
    });
    expect(parseRewindQuery({ period: "2025", forceRedo: "false" }).forceRedo).toBe(false);
    expect(() => parseRewindQuery({ period: "2025-13" })).toThrow(BadRequestException);
    expect(() => parseRewindQuery({ period: undefined })).toThrow(BadRequestException);
    expect(() => parseRewindQuery({ period: "2025", tz: "Not/AZone" })).toThrow(BadRequestException);
    expect(() => parseRewindQuery({ period: "2025", tz: ["UTC", "UTC"] })).toThrow(BadRequestException);
  });
});
