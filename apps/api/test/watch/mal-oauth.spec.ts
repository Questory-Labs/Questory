import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, Logger } from "@nestjs/common";
import { MalService } from "../../src/watch/mal/mal.service";
import {
  signMalOAuthState,
  verifyMalOAuthState,
} from "../../src/watch/mal/mal-auth";
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

const TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const REDIRECT = "https://api.example/v1/watch/mal/callback";

function build(existing: unknown = null, user: { id: string } | null = { id: "u-1" }) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(existing),
    upsert: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const service = new MalService(
    { sourceConnection } as unknown as PrismaService,
    {} as CatalogService,
    {} as EnrichmentService,
    { resolveUser: vi.fn().mockResolvedValue(user) } as unknown as UsersService,
    {} as ReadCatalogService,
    {} as FeatureFlagsService,
  );
  const syncList = vi.spyOn(service, "syncList").mockResolvedValue({ ok: true } as never);
  return { service, sourceConnection, syncList };
}

function tokenOk(body: Record<string, unknown> = { access_token: "a-1", refresh_token: "r-1", expires_in: 3600 }) {
  providerFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

beforeEach(() => {
  providerFetch.mockReset();
  vi.stubEnv("MAL_CLIENT_ID", "mal-id");
  vi.stubEnv("MAL_CLIENT_SECRET", "mal-secret");
  vi.stubEnv("MAL_REDIRECT_URI", REDIRECT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MalService.configured", () => {
  it("requires both id and secret", () => {
    const { service } = build();
    expect(service.configured()).toBe(true);
    vi.stubEnv("MAL_CLIENT_SECRET", " ");
    expect(service.configured()).toBe(false);
  });
});

describe("MalService.buildAuthState", () => {
  it("builds an authorize URL whose challenge matches the signed verifier", () => {
    const { url, state } = build().service.buildAuthState("u-1");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://myanimelist.net/v1/oauth2/authorize",
    );
    const verified = verifyMalOAuthState(state);
    expect(verified?.userId).toBe("u-1");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      response_type: "code",
      client_id: "mal-id",
      redirect_uri: REDIRECT,
      code_challenge: verified?.codeVerifier,
      code_challenge_method: "plain",
      state,
    });
  });

  it("never exposes the client secret", () => {
    expect(build().service.buildAuthState("u-1").url).not.toContain("mal-secret");
  });

  it("issues a fresh verifier per attempt", () => {
    const { service } = build();
    const a = verifyMalOAuthState(service.buildAuthState("u-1").state);
    const b = verifyMalOAuthState(service.buildAuthState("u-1").state);
    expect(a?.codeVerifier).not.toBe(b?.codeVerifier);
  });
});

describe("MalService.exchangeCode", () => {
  const state = () => signMalOAuthState("u-1", "verifier-1");

  it("rejects when not configured", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "");
    await expect(build().service.exchangeCode("c", state())).rejects.toThrow(
      "not configured",
    );
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", () => undefined],
    ["garbage", () => "a.b"],
    ["expired", () => signMalOAuthState("u-1", "v", { ttlMs: -1000 })],
    ["forged", () => signMalOAuthState("u-1", "v", { secret: "other" })],
  ])("rejects a %s state without calling upstream", async (_label, makeState) => {
    const { service, sourceConnection } = build();
    await expect(service.exchangeCode("c", makeState())).rejects.toThrow(
      "Invalid or expired OAuth state",
    );
    expect(providerFetch).not.toHaveBeenCalled();
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("rejects a state issued to a different session user", async () => {
    const { service, sourceConnection } = build();
    await expect(service.exchangeCode("c", state(), "attacker")).rejects.toThrow(
      "OAuth state user mismatch",
    );
    expect(providerFetch).not.toHaveBeenCalled();
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("accepts a state matching the session user", async () => {
    tokenOk();
    await expect(
      build().service.exchangeCode("c", state(), "u-1"),
    ).resolves.toEqual({ ok: true, userId: "u-1" });
  });

  it("form-posts the code and the verifier from the state", async () => {
    tokenOk();
    await build().service.exchangeCode("the-code", state());
    const [url, init] = providerFetch.mock.calls[0];
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      client_id: "mal-id",
      client_secret: "mal-secret",
      grant_type: "authorization_code",
      code: "the-code",
      redirect_uri: REDIRECT,
      code_verifier: "verifier-1",
    });
  });

  it("stores tokens for the state user with a computed expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
    tokenOk();
    const { service, sourceConnection } = build();
    await service.exchangeCode("c", state());
    const expiresAt = new Date("2026-01-01T01:00:00Z");
    expect(sourceConnection.upsert).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "u-1", provider: "mal" } },
      create: {
        userId: "u-1",
        provider: "mal",
        accessToken: "a-1",
        refreshToken: "r-1",
        expiresAt,
      },
      update: { accessToken: "a-1", refreshToken: "r-1", expiresAt, lastError: null },
    });
  });

  it("keeps the old refresh token and clears expiry when upstream omits them", async () => {
    tokenOk({ access_token: "a-2" });
    const { service, sourceConnection } = build({ id: "c" });
    await service.exchangeCode("c", state());
    const arg = sourceConnection.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ refreshToken: null, expiresAt: null });
    expect(arg.update).toEqual({
      accessToken: "a-2",
      refreshToken: undefined,
      expiresAt: null,
      lastError: null,
    });
  });

  it("stores nothing when the exchange fails", async () => {
    providerFetch.mockResolvedValue(new Response("invalid_grant", { status: 400 }));
    const { service, sourceConnection, syncList } = build();
    await expect(service.exchangeCode("c", state())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
    expect(syncList).not.toHaveBeenCalled();
  });

  it("logs the upstream body but does not return it to the caller", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    providerFetch.mockResolvedValue(new Response("upstream-detail", { status: 400 }));
    const err = (await build().service.exchangeCode("c", state()).catch((e) => e)) as Error;
    expect(err.message).toBe("MAL token exchange failed (400)");
    expect(warn.mock.calls[0][0]).toContain("upstream-detail");
  });

  it.each([
    ["an empty object", () => new Response("{}", { status: 200 })],
    ["a null token", () => new Response('{"access_token":null}', { status: 200 })],
    ["non-JSON", () => new Response("<html>", { status: 200 })],
  ])("rejects %s and stores nothing", async (_label, response) => {
    providerFetch.mockImplementation(async () => response());
    const { service, sourceConnection, syncList } = build(null);
    await expect(service.exchangeCode("c", state())).rejects.toThrow(
      "MAL token response missing access_token",
    );
    expect(sourceConnection.upsert).not.toHaveBeenCalled();
    expect(syncList).not.toHaveBeenCalled();
  });

  it("syncs on first connect only", async () => {
    tokenOk();
    const first = build(null);
    await first.service.exchangeCode("c", state());
    expect(first.syncList).toHaveBeenCalledWith("u-1");

    tokenOk();
    const again = build({ id: "c" });
    await again.service.exchangeCode("c", state());
    expect(again.syncList).not.toHaveBeenCalled();
  });

  it("does not fail the connect when the background sync fails", async () => {
    tokenOk();
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    const { service, syncList } = build(null);
    syncList.mockRejectedValue(new Error("boom"));
    await expect(service.exchangeCode("c", state())).resolves.toMatchObject({ ok: true });
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith("MAL sync failed: boom"),
    );
  });
});

describe("MalService connection state", () => {
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

  it("reports connected without leaking tokens", async () => {
    await expect(
      build({
        accessToken: "secret",
        refreshToken: "secret2",
        lastSyncedAt: new Date("2026-02-03T00:00:00.000Z"),
      }).service.getConnection("u-1"),
    ).resolves.toEqual({
      connected: true,
      userId: "u-1",
      syncing: false,
      lastSyncedAt: "2026-02-03T00:00:00.000Z",
    });
  });

  it("disconnect removes only the caller's mal row", async () => {
    const { service, sourceConnection } = build();
    await expect(service.disconnect("u-1")).resolves.toEqual({
      ok: true,
      disconnected: false,
    });
    expect(sourceConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", provider: "mal" },
    });
  });
});
