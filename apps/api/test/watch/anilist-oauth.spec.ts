import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AnilistService } from "../../src/watch/anilist/anilist.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { ReadCatalogService } from "../../src/read/catalog/catalog.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

const { providerFetch } = vi.hoisted(() => ({ providerFetch: vi.fn() }));

vi.mock("../../src/lib/qhttp-outbound", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/qhttp-outbound")>()),
  providerFetch,
}));

const TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

function build(existing: unknown = null, user: { id: string } | null = { id: "u-1" }) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(existing),
    upsert: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const users = { resolveUser: vi.fn().mockResolvedValue(user) };
  const service = new AnilistService(
    { sourceConnection } as unknown as PrismaService,
    {} as CatalogService,
    {} as EnrichmentService,
    users as unknown as UsersService,
    {} as ReadCatalogService,
    {} as FeatureFlagsService,
  );
  const syncList = vi
    .spyOn(service, "syncList")
    .mockResolvedValue({ ok: true } as never);
  return { service, sourceConnection, users, syncList };
}

beforeEach(() => {
  providerFetch.mockReset();
  vi.stubEnv("ANILIST_CLIENT_ID", "client-id");
  vi.stubEnv("ANILIST_CLIENT_SECRET", "client-secret");
  vi.stubEnv("ANILIST_REDIRECT_URI", "https://api.example/v1/watch/anilist/callback");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("AnilistService.configured", () => {
  it("requires both id and secret", () => {
    const { service } = build();
    expect(service.configured()).toBe(true);
    vi.stubEnv("ANILIST_CLIENT_SECRET", "");
    expect(service.configured()).toBe(false);
    vi.stubEnv("ANILIST_CLIENT_SECRET", "s");
    vi.stubEnv("ANILIST_CLIENT_ID", "   ");
    expect(service.configured()).toBe(false);
  });
});

describe("AnilistService.authUrl", () => {
  it("builds the authorize URL with state", () => {
    const url = new URL(build().service.authUrl("signed.state"));
    expect(url.origin + url.pathname).toBe(
      "https://anilist.co/api/v2/oauth/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: "https://api.example/v1/watch/anilist/callback",
      response_type: "code",
      state: "signed.state",
    });
  });

  it("omits state when not provided", () => {
    const url = new URL(build().service.authUrl());
    expect(url.searchParams.has("state")).toBe(false);
  });

  it("never exposes the client secret", () => {
    expect(build().service.authUrl("s")).not.toContain("client-secret");
  });

  it("throws when not configured", () => {
    vi.stubEnv("ANILIST_CLIENT_ID", "");
    expect(() => build().service.authUrl("s")).toThrow(BadRequestException);
  });
});

describe("AnilistService.exchangeCode", () => {
  function tokenOk(token = "access-1") {
    providerFetch.mockResolvedValue(
      new Response(JSON.stringify({ access_token: token }), { status: 200 }),
    );
  }

  it("rejects when not configured without calling upstream", async () => {
    vi.stubEnv("ANILIST_CLIENT_SECRET", "");
    await expect(build().service.exchangeCode("c", "u-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown user without calling upstream", async () => {
    await expect(
      build(null, null).service.exchangeCode("c", "ghost"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("posts the code and client credentials as JSON", async () => {
    tokenOk();
    await build().service.exchangeCode("the-code", "u-1");
    const [url, init] = providerFetch.mock.calls[0];
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      grant_type: "authorization_code",
      client_id: "client-id",
      client_secret: "client-secret",
      redirect_uri: "https://api.example/v1/watch/anilist/callback",
      code: "the-code",
    });
  });

  it("stores the token for the resolved user only", async () => {
    tokenOk("tok");
    const { service, sourceConnection } = build();
    await expect(service.exchangeCode("c", "u-1")).resolves.toEqual({
      ok: true,
      userId: "u-1",
    });
    expect(sourceConnection.upsert).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "u-1", provider: "anilist" } },
      create: { userId: "u-1", provider: "anilist", accessToken: "tok" },
      update: { accessToken: "tok", lastError: null },
    });
  });

  it("rejects and stores nothing when the exchange fails", async () => {
    providerFetch.mockResolvedValue(new Response("invalid_grant", { status: 400 }));
    const { service, sourceConnection, syncList } = build();
    await expect(service.exchangeCode("bad", "u-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
    expect(syncList).not.toHaveBeenCalled();
  });

  it("logs the upstream body but does not return it to the caller", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    providerFetch.mockResolvedValue(new Response("upstream-detail", { status: 400 }));
    const err = (await build().service.exchangeCode("bad", "u-1").catch((e) => e)) as Error;
    expect(err.message).toBe("AniList token exchange failed (400)");
    expect(warn.mock.calls[0][0]).toContain("upstream-detail");
  });

  it.each([
    ["an empty object", () => new Response("{}", { status: 200 })],
    ["a null token", () => new Response('{"access_token":null}', { status: 200 })],
    ["non-JSON", () => new Response("<html>", { status: 200 })],
  ])("rejects %s and stores nothing", async (_label, response) => {
    providerFetch.mockImplementation(async () => response());
    const { service, sourceConnection, syncList } = build(null);
    await expect(service.exchangeCode("c", "u-1")).rejects.toThrow(
      "AniList token response missing access_token",
    );
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
    expect(syncList).not.toHaveBeenCalled();
  });

  it("starts an initial sync on first connect", async () => {
    tokenOk();
    const { service, syncList } = build(null);
    await service.exchangeCode("c", "u-1");
    expect(syncList).toHaveBeenCalledWith("u-1");
  });

  it("does not resync on reconnect", async () => {
    tokenOk();
    const { service, syncList } = build({ id: "conn-1" });
    await service.exchangeCode("c", "u-1");
    expect(syncList).not.toHaveBeenCalled();
  });

  it("does not fail the connect when the background sync fails", async () => {
    tokenOk();
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    const { service, syncList } = build(null);
    syncList.mockRejectedValue(new Error("upstream down"));
    await expect(service.exchangeCode("c", "u-1")).resolves.toMatchObject({
      ok: true,
    });
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith("AniList sync failed: upstream down"),
    );
  });
});

describe("AnilistService.getConnection", () => {
  it("returns null without a user", async () => {
    await expect(build(null, null).service.getConnection()).resolves.toBeNull();
  });

  it("reports disconnected", async () => {
    await expect(build(null).service.getConnection("u-1")).resolves.toEqual({
      connected: false,
      userId: "u-1",
      syncing: false,
      lastSyncedAt: null,
    });
  });

  it("reports connected state without leaking tokens", async () => {
    const lastSyncedAt = new Date("2026-01-02T03:04:05.000Z");
    const result = await build({
      id: "c",
      accessToken: "secret-token",
      lastSyncedAt,
    }).service.getConnection("u-1");
    expect(result).toEqual({
      connected: true,
      userId: "u-1",
      syncing: false,
      lastSyncedAt: "2026-01-02T03:04:05.000Z",
    });
  });

  it("looks up only the resolved user's connection", async () => {
    const { service, sourceConnection } = build(null, { id: "canonical" });
    await service.getConnection("alias");
    expect(sourceConnection.findUnique).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "canonical", provider: "anilist" } },
    });
  });
});

describe("AnilistService.disconnect", () => {
  it("removes only the anilist row for the caller", async () => {
    const { service, sourceConnection } = build();
    await expect(service.disconnect("u-1")).resolves.toEqual({
      ok: true,
      disconnected: true,
    });
    expect(sourceConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", provider: "anilist" },
    });
  });
});
