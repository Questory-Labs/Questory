import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TraktService } from "../../src/watch/trakt/trakt.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

const { providerFetch } = vi.hoisted(() => ({ providerFetch: vi.fn() }));
vi.mock("../../src/lib/qhttp-outbound", () => ({ providerFetch }));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function setup(user: { id: string } | null = { id: "u-1" }) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const users = { resolveUser: vi.fn().mockResolvedValue(user) };
  const service = new TraktService(
    { sourceConnection } as unknown as PrismaService,
    {} as CatalogService,
    {} as EnrichmentService,
    users as unknown as UsersService,
    {} as FeatureFlagsService,
  );
  return { service, sourceConnection, users };
}

const ENV_KEYS = [
  "TRAKT_CLIENT_ID",
  "TRAKT_CLIENT_SECRET",
  "TRAKT_REDIRECT_URI",
] as const;

describe("TraktService auth", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    providerFetch.mockReset();
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.TRAKT_CLIENT_ID = "cid";
    process.env.TRAKT_CLIENT_SECRET = "csecret";
    process.env.TRAKT_REDIRECT_URI = "https://app.example/cb";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("configured", () => {
    it("is true only when both id and secret are set", () => {
      expect(setup().service.configured()).toBe(true);
      process.env.TRAKT_CLIENT_SECRET = "   ";
      expect(setup().service.configured()).toBe(false);
      process.env.TRAKT_CLIENT_SECRET = "csecret";
      delete process.env.TRAKT_CLIENT_ID;
      expect(setup().service.configured()).toBe(false);
    });
  });

  describe("authUrl", () => {
    it("builds the authorize URL with state", () => {
      const url = new URL(setup().service.authUrl("st ate"));
      expect(url.origin + url.pathname).toBe("https://trakt.tv/oauth/authorize");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        response_type: "code",
        client_id: "cid",
        redirect_uri: "https://app.example/cb",
        state: "st ate",
      });
    });

    it("omits state when none is given", () => {
      const url = new URL(setup().service.authUrl());
      expect(url.searchParams.has("state")).toBe(false);
    });

    it("rejects when not configured", () => {
      delete process.env.TRAKT_CLIENT_SECRET;
      expect(() => setup().service.authUrl("s")).toThrow(BadRequestException);
    });

    it("never exposes the client secret", () => {
      expect(setup().service.authUrl("s")).not.toContain("csecret");
    });
  });

  describe("exchangeCode", () => {
    it("rejects when not configured without calling Trakt", async () => {
      delete process.env.TRAKT_CLIENT_ID;
      const { service, users } = setup();
      await expect(service.exchangeCode("c", "u-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.resolveUser).not.toHaveBeenCalled();
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it("rejects an unknown user without calling Trakt", async () => {
      const { service } = setup(null);
      await expect(service.exchangeCode("c", "ghost")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it("posts the authorization_code grant", async () => {
      const { service } = setup();
      vi.spyOn(service, "syncHistory").mockResolvedValue({
        ok: true,
        accepted: 0,
        userId: "u-1",
      });
      providerFetch.mockResolvedValue(json({ access_token: "at" }));

      await service.exchangeCode("the-code", "u-1");

      const [url, init] = providerFetch.mock.calls[0]!;
      expect(url).toBe("https://api.trakt.tv/oauth/token");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init.body as string)).toEqual({
        code: "the-code",
        client_id: "cid",
        client_secret: "csecret",
        redirect_uri: "https://app.example/cb",
        grant_type: "authorization_code",
      });
    });

    it("surfaces an upstream rejection and stores nothing", async () => {
      const { service, sourceConnection } = setup();
      providerFetch.mockResolvedValue(new Response("invalid_grant", { status: 401 }));
      await expect(service.exchangeCode("bad", "u-1")).rejects.toThrow(
        "Trakt token exchange failed: invalid_grant",
      );
      expect(sourceConnection.upsert).not.toHaveBeenCalled();
    });

    it("rejects a success response without an access token and stores nothing", async () => {
      const { service, sourceConnection } = setup();
      const sync = vi.spyOn(service, "syncHistory");
      providerFetch.mockResolvedValue(json({ refresh_token: "rt" }));
      await expect(service.exchangeCode("c", "u-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(sourceConnection.upsert).not.toHaveBeenCalled();
      expect(sync).not.toHaveBeenCalled();
    });

    it("bounds the token request with a timeout signal", async () => {
      const { service } = setup();
      providerFetch.mockResolvedValue(new Response("no", { status: 400 }));
      await expect(service.exchangeCode("c", "u-1")).rejects.toThrow();
      expect(providerFetch.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
    });

    it("propagates transport failures and stores nothing", async () => {
      const { service, sourceConnection } = setup();
      providerFetch.mockRejectedValue(new Error("socket hang up"));
      await expect(service.exchangeCode("c", "u-1")).rejects.toThrow("socket hang up");
      expect(sourceConnection.upsert).not.toHaveBeenCalled();
    });

    it("stores tokens against the resolved user and computes expiry", async () => {
      vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
      const { service, sourceConnection } = setup({ id: "resolved" });
      vi.spyOn(service, "syncHistory").mockResolvedValue({
        ok: true,
        accepted: 0,
        userId: "resolved",
      });
      providerFetch.mockResolvedValue(
        json({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
      );

      const result = await service.exchangeCode("c", "requested");

      expect(result).toEqual({ ok: true, userId: "resolved" });
      const args = sourceConnection.upsert.mock.calls[0]![0];
      const expiresAt = new Date("2026-01-01T01:00:00Z");
      expect(args.where).toEqual({
        userId_provider: { userId: "resolved", provider: "trakt" },
      });
      expect(args.create).toEqual({
        userId: "resolved",
        provider: "trakt",
        accessToken: "at",
        refreshToken: "rt",
        expiresAt,
      });
      expect(args.update).toEqual({
        accessToken: "at",
        refreshToken: "rt",
        expiresAt,
      });
    });

    it("stores a null expiry when Trakt omits expires_in", async () => {
      const { service, sourceConnection } = setup();
      vi.spyOn(service, "syncHistory").mockResolvedValue({
        ok: true,
        accepted: 0,
        userId: "u-1",
      });
      providerFetch.mockResolvedValue(json({ access_token: "at" }));
      await service.exchangeCode("c", "u-1");
      expect(sourceConnection.upsert.mock.calls[0]![0].create).toMatchObject({
        refreshToken: null,
        expiresAt: null,
      });
    });

    it("starts a backfill only for a first-time connection", async () => {
      const { service, sourceConnection } = setup();
      const sync = vi.spyOn(service, "syncHistory").mockResolvedValue({
        ok: true,
        accepted: 0,
        userId: "u-1",
      });
      providerFetch.mockImplementation(async () => json({ access_token: "at" }));

      await service.exchangeCode("c", "u-1");
      expect(sync).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledWith("u-1");

      sourceConnection.findUnique.mockResolvedValue({ id: "conn" });
      await service.exchangeCode("c2", "u-1");
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("does not fail the exchange when the backfill fails", async () => {
      const { service } = setup();
      vi.spyOn(service, "syncHistory").mockRejectedValue(new Error("boom"));
      providerFetch.mockResolvedValue(json({ access_token: "at" }));
      await expect(service.exchangeCode("c", "u-1")).resolves.toEqual({
        ok: true,
        userId: "u-1",
      });
    });
  });

  describe("getConnection", () => {
    it("returns null when no user resolves", async () => {
      await expect(setup(null).service.getConnection("x")).resolves.toBeNull();
    });

    it("reports disconnected without a connection row", async () => {
      const { service, sourceConnection } = setup();
      await expect(service.getConnection("u-1")).resolves.toEqual({
        connected: false,
        userId: "u-1",
        syncing: false,
      });
      expect(sourceConnection.findUnique).toHaveBeenCalledWith({
        where: { userId_provider: { userId: "u-1", provider: "trakt" } },
      });
    });

    it("reports sync metadata and never returns tokens", async () => {
      const { service, sourceConnection } = setup();
      sourceConnection.findUnique.mockResolvedValue({
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
        lastSyncedAt: new Date("2026-02-03T04:05:06Z"),
        syncCursor: "cursor",
      });
      const status = await service.getConnection("u-1");
      expect(status).toEqual({
        connected: true,
        userId: "u-1",
        syncing: false,
        lastSyncedAt: "2026-02-03T04:05:06.000Z",
        syncCursor: "cursor",
      });
      expect(JSON.stringify(status)).not.toContain("secret-");
    });

    it("reports a null lastSyncedAt for a never-synced connection", async () => {
      const { service, sourceConnection } = setup();
      sourceConnection.findUnique.mockResolvedValue({
        lastSyncedAt: null,
        syncCursor: null,
      });
      await expect(service.getConnection("u-1")).resolves.toMatchObject({
        connected: true,
        lastSyncedAt: null,
        syncCursor: null,
      });
    });
  });

  describe("disconnect", () => {
    it("deletes only the caller's trakt connection", async () => {
      const { service, sourceConnection } = setup({ id: "u-1" });
      await expect(service.disconnect("u-1")).resolves.toEqual({
        ok: true,
        disconnected: true,
      });
      expect(sourceConnection.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u-1", provider: "trakt" },
      });
    });

    it("rejects an unknown user", async () => {
      const { service, sourceConnection } = setup(null);
      await expect(service.disconnect("x")).rejects.toBeInstanceOf(NotFoundException);
      expect(sourceConnection.deleteMany).not.toHaveBeenCalled();
    });
  });
});
