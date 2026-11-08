import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_KEY_TYPES } from "../../src/accounts/account.constants";
import { ApiKeysService } from "../../src/api-keys/api-keys.service";
import { hashToken } from "../../src/music/lib/tokens";

const now = new Date("2026-01-01T00:00:00.000Z");

function build() {
  const order: string[] = [];
  const prisma = {
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "u1", personaName: "Persona" }),
    },
    apiKey: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockImplementation(async () => {
        order.push("rotate");
        return { count: 1 };
      }),
      create: vi
        .fn()
        .mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          order.push("create");
          return { id: "k1", createdAt: now, ...data };
        }),
    },
  };
  const accounts = {
    ensureListenbrainzAccount: vi.fn().mockImplementation(async () => {
      order.push("ensure");
    }),
    getListenbrainzUsername: vi.fn().mockResolvedValue("rj"),
    getSteamId: vi.fn().mockResolvedValue("7656"),
  };
  const scrobbler = { hasNative: vi.fn().mockResolvedValue(false) };
  const service = new ApiKeysService(
    prisma as never,
    accounts as never,
    scrobbler as never,
  );
  return { service, prisma, accounts, scrobbler, order };
}

describe("ApiKeysService source key types", () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    ctx = build();
  });

  it("knows the two source ingest types", () => {
    expect(API_KEY_TYPES).toEqual(
      expect.arrayContaining(["music_ingest", "watch_webhook"]),
    );
  });

  describe("create validation", () => {
    it.each(["", "admin", "MUSIC_INGEST", "music_ingest "])(
      "rejects type %j",
      async (type) => {
        await expect(ctx.service.create("u1", { type })).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
        expect(ctx.prisma.apiKey.updateMany).not.toHaveBeenCalled();
      },
    );

    it("404s an unknown user without revoking anything", async () => {
      ctx.prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        ctx.service.create("ghost", { type: "watch_webhook" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.prisma.apiKey.updateMany).not.toHaveBeenCalled();
      expect(ctx.prisma.apiKey.create).not.toHaveBeenCalled();
    });
  });

  describe("token material", () => {
    it.each(["music_ingest", "watch_webhook"])(
      "stores only a hash the guards can match for %s",
      async (type) => {
        const created = await ctx.service.create("u1", { type });
        const data = ctx.prisma.apiKey.create.mock.calls[0][0].data;
        expect(data.tokenHash).toBe(hashToken(created.token));
        expect(data.tokenHash).not.toBe(created.token);
        expect(JSON.stringify(data)).not.toContain(created.token);
        expect(created.token.startsWith(data.tokenPrefix)).toBe(true);
        expect(data.tokenPrefix.length).toBeLessThan(created.token.length);
      },
    );

    it("does not return the hash to the caller", async () => {
      const created = await ctx.service.create("u1", { type: "watch_webhook" });
      expect(created).not.toHaveProperty("tokenHash");
    });

    it("mints a different token on each rotation", async () => {
      const a = await ctx.service.create("u1", { type: "watch_webhook" });
      const b = await ctx.service.create("u1", { type: "watch_webhook" });
      expect(a.token).not.toBe(b.token);
    });
  });

  describe("rotation", () => {
    it("revokes only the caller's keys of that type before creating", async () => {
      await ctx.service.create("u1", { type: "music_ingest" });
      expect(ctx.prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", type: "music_ingest", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(ctx.order).toEqual(["ensure", "rotate", "create"]);
    });

    it("revokes and creates in one transaction", async () => {
      await ctx.service.create("u1", { type: "watch_webhook" });
      expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(ctx.prisma.$transaction.mock.calls[0][0]).toHaveLength(2);
    });

    it("surfaces a failed rotation instead of returning a token", async () => {
      ctx.prisma.$transaction.mockRejectedValue(new Error("tx failed"));
      await expect(
        ctx.service.create("u1", { type: "watch_webhook" }),
      ).rejects.toThrow("tx failed");
    });

    it("keeps the existing key when native scrobbling blocks a new one", async () => {
      ctx.scrobbler.hasNative.mockResolvedValue(true);
      await expect(
        ctx.service.create("u1", { type: "music_ingest" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(ctx.accounts.ensureListenbrainzAccount).not.toHaveBeenCalled();
      expect(ctx.prisma.apiKey.updateMany).not.toHaveBeenCalled();
      expect(ctx.prisma.apiKey.create).not.toHaveBeenCalled();
    });
  });

  describe("per-type behavior", () => {
    it("music_ingest ensures the ListenBrainz account and returns its name", async () => {
      const created = await ctx.service.create("u1", { type: "music_ingest" });
      expect(ctx.accounts.ensureListenbrainzAccount).toHaveBeenCalledWith(
        "u1",
        "Persona",
      );
      expect(created.listenbrainzUsername).toBe("rj");
    });

    it("watch_webhook skips all music setup", async () => {
      const created = await ctx.service.create("u1", { type: "watch_webhook" });
      expect(ctx.scrobbler.hasNative).not.toHaveBeenCalled();
      expect(ctx.accounts.ensureListenbrainzAccount).not.toHaveBeenCalled();
      expect(ctx.accounts.getListenbrainzUsername).not.toHaveBeenCalled();
      expect(created.listenbrainzUsername).toBeNull();
      expect(created.type).toBe("watch_webhook");
    });

    it.each([
      ["  Plex  ", "Plex"],
      ["   ", null],
      [null, null],
      [undefined, null],
    ])("normalizes label %j", async (label, expected) => {
      await ctx.service.create("u1", { type: "watch_webhook", label });
      expect(ctx.prisma.apiKey.create.mock.calls[0][0].data.label).toBe(expected);
    });
  });

  describe("list", () => {
    it("never selects the token hash", async () => {
      await ctx.service.list("u1");
      const args = ctx.prisma.apiKey.findMany.mock.calls[0][0];
      expect(args.select).not.toHaveProperty("tokenHash");
      expect(args.where.userId).toBe("u1");
      expect(args.orderBy).toEqual({ createdAt: "desc" });
    });
  });

  describe("revoke", () => {
    it("looks up by id, owner and active state", async () => {
      ctx.prisma.apiKey.findFirst.mockResolvedValue({ id: "k1" });
      await expect(ctx.service.revoke("u1", "k1")).resolves.toEqual({ ok: true });
      expect(ctx.prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: { id: "k1", userId: "u1", revokedAt: null },
      });
      expect(ctx.prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "k1" },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("404s another user's or an already revoked key without writing", async () => {
      ctx.prisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(ctx.service.revoke("u1", "theirs")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ctx.prisma.apiKey.update).not.toHaveBeenCalled();
    });
  });

  describe("identity", () => {
    it("aggregates steam, listenbrainz, keys and native state", async () => {
      const keys = [{ id: "k1", type: "music_ingest" }];
      ctx.prisma.apiKey.findMany.mockResolvedValue(keys);
      ctx.scrobbler.hasNative.mockResolvedValue(true);
      await expect(ctx.service.identity("u1")).resolves.toEqual({
        steamId: "7656",
        listenbrainzUsername: "rj",
        keys,
        nativeScrobbling: true,
      });
      expect(ctx.accounts.getSteamId).toHaveBeenCalledWith("u1");
      expect(ctx.scrobbler.hasNative).toHaveBeenCalledWith("u1");
    });
  });
});
