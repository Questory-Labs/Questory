import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ApiKeysService } from "../../src/api-keys/api-keys.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { AccountsService } from "../../src/accounts/accounts.service";
import type { ScrobblerConnections } from "../../src/music/scrobbler/scrobbler.connections";

const now = new Date("2026-01-01T00:00:00.000Z");

function build() {
  const prisma = {
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    user: { findUnique: vi.fn().mockResolvedValue({ id: "u1", personaName: "P" }) },
    apiKey: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "k1",
        createdAt: now,
        ...data,
      })),
    },
  };
  const accounts = {
    ensureListenbrainzAccount: vi.fn(),
    getListenbrainzUsername: vi.fn().mockResolvedValue(null),
  };
  const scrobbler = { hasNative: vi.fn().mockResolvedValue(false) };
  const service = new ApiKeysService(
    prisma as unknown as PrismaService,
    accounts as unknown as AccountsService,
    scrobbler as unknown as ScrobblerConnections,
  );
  return { service, prisma };
}

describe("ApiKeysService public keys", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("creates a public key without revoking other public keys", async () => {
    const created = await ctx.service.createPublic("u1", {
      label: " Dashboard ",
      scopes: ["library:read", "profile:read", "library:read"],
    });
    expect(ctx.prisma.apiKey.updateMany).not.toHaveBeenCalled();
    expect(ctx.prisma.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        type: "public",
        label: "Dashboard",
        scopes: JSON.stringify(["library:read", "profile:read"]),
      }),
    });
    expect(created.token.length).toBeGreaterThan(20);
    expect(created.scopes).toEqual(["library:read", "profile:read"]);
    expect(created.tokenPrefix).toBe(created.token.slice(0, created.tokenPrefix.length));
  });

  it("rejects scopes outside the allowlist", async () => {
    await expect(
      ctx.service.createPublic("u1", { label: "x", scopes: ["admin:write"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      ctx.service.createPublic("u1", { label: "x", scopes: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      ctx.service.createPublic("u1", { label: "", scopes: ["profile:read"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("caps active public keys per user", async () => {
    ctx.prisma.apiKey.count.mockResolvedValue(20);
    await expect(
      ctx.service.createPublic("u1", { label: "x", scopes: ["profile:read"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("legacy create still rotates one key per type", async () => {
    await ctx.service.create("u1", { type: "watch_webhook" });
    expect(ctx.prisma.apiKey.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", type: "watch_webhook", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("legacy create rejects the public type", async () => {
    await expect(ctx.service.create("u1", { type: "public" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(ctx.prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("listPublic parses scopes and excludes other types; list excludes public", async () => {
    ctx.prisma.apiKey.findMany.mockResolvedValue([
      {
        id: "k1",
        tokenPrefix: "qst_abc",
        label: "A",
        scopes: JSON.stringify(["profile:read", "bogus"]),
        createdAt: now,
        lastUsedAt: null,
      },
    ]);
    const rows = await ctx.service.listPublic("u1");
    expect(rows).toEqual([
      {
        id: "k1",
        tokenPrefix: "qst_abc",
        label: "A",
        scopes: ["profile:read"],
        createdAt: now.toISOString(),
        lastUsedAt: null,
      },
    ]);
    expect(ctx.prisma.apiKey.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: "u1", revokedAt: null, type: "public" },
      }),
    );

    await ctx.service.list("u1");
    expect(ctx.prisma.apiKey.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: "u1", revokedAt: null, type: { not: "public" } },
      }),
    );
  });
});
