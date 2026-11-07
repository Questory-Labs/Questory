import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger, NotFoundException } from "@nestjs/common";
import { MalService } from "../../src/watch/mal/mal.service";
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
const CONN = {
  id: "conn-1",
  accessToken: "tok-1",
  refreshToken: "ref-1",
  expiresAt: null as Date | null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function animePages(...pages: unknown[]) {
  const queue = [...pages];
  providerFetch.mockImplementation(async (url: string) =>
    url === TOKEN_URL
      ? json({ access_token: "new" })
      : json(queue.shift() ?? { data: [] }),
  );
}

function entry(listStatus: Record<string, unknown> = {}, node: Record<string, unknown> = {}) {
  return {
    node: {
      id: 100,
      title: "Title",
      main_picture: { large: "https://img/l", medium: "https://img/m" },
      start_date: "2020-04-01",
      num_episodes: 12,
      ...node,
    },
    list_status: {
      status: "completed",
      score: 0,
      num_episodes_watched: 12,
      updated_at: "2023-01-02T03:04:05+00:00",
      ...listStatus,
    },
  };
}

function build(opts: { conn?: unknown; user?: { id: string } | null; source?: boolean } = {}) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(opts.conn === undefined ? CONN : opts.conn),
    update: vi.fn().mockResolvedValue({}),
  };
  const catalog = {
    upsertTitle: vi.fn(async (i: { malId: number }) => ({ id: `t-${i.malId}` })),
    recordWatch: vi.fn().mockResolvedValue({}),
    upsertListState: vi.fn().mockResolvedValue({}),
    syncDroppedListState: vi.fn().mockResolvedValue(undefined),
  };
  const enrichment = { enqueueTitle: vi.fn() };
  const users = {
    resolveUser: vi.fn().mockResolvedValue(opts.user === undefined ? { id: "u-1" } : opts.user),
  };
  const flags = {
    isSourceEnabled: vi.fn().mockResolvedValue(opts.source ?? true),
    isDomainEnabled: vi.fn().mockResolvedValue(true),
  };
  const service = new MalService(
    { sourceConnection } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    enrichment as unknown as EnrichmentService,
    users as unknown as UsersService,
    {} as ReadCatalogService,
    flags as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, catalog, enrichment, users };
}

beforeEach(() => {
  providerFetch.mockReset();
  vi.stubEnv("MAL_CLIENT_ID", "mal-id");
  vi.stubEnv("MAL_CLIENT_SECRET", "mal-secret");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MalService.syncList preconditions", () => {
  it("skips without lookups when the source is off", async () => {
    const { service, users } = build({ source: false });
    await expect(service.syncList("u-1")).resolves.toEqual({
      ok: true,
      skipped: true,
      accepted: 0,
      mangaAccepted: 0,
    });
    expect(users.resolveUser).not.toHaveBeenCalled();
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown user", async () => {
    await expect(build({ user: null }).service.syncList("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects when not connected", async () => {
    await expect(build({ conn: null }).service.syncList("u-1")).rejects.toThrow(
      "MAL not connected",
    );
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("uses the resolved user's connection", async () => {
    animePages();
    const { service, sourceConnection } = build({ user: { id: "canonical" } });
    await service.syncList("alias", "watch");
    expect(sourceConnection.findUnique).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "canonical", provider: "mal" } },
    });
  });
});

describe("MalService token refresh", () => {
  function animeOnlyAfterRefresh(tokenResponse: Response) {
    providerFetch.mockImplementation(async (url: string) =>
      url === TOKEN_URL ? tokenResponse : json({ data: [] }),
    );
  }

  function bearerUsed() {
    const call = providerFetch.mock.calls.find(([url]) => url !== TOKEN_URL);
    return call?.[1].headers.Authorization;
  }

  it("skips refresh when there is no expiry", async () => {
    animePages();
    await build().service.syncList("u-1", "watch");
    expect(providerFetch.mock.calls.some(([u]) => u === TOKEN_URL)).toBe(false);
    expect(bearerUsed()).toBe("Bearer tok-1");
  });

  it("skips refresh when the token has more than a minute left", async () => {
    animePages();
    const conn = { ...CONN, expiresAt: new Date(Date.now() + 120_000) };
    await build({ conn }).service.syncList("u-1", "watch");
    expect(providerFetch.mock.calls.some(([u]) => u === TOKEN_URL)).toBe(false);
  });

  it("refreshes inside the 60 second window and uses the new token", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
    animeOnlyAfterRefresh(
      json({ access_token: "tok-2", refresh_token: "ref-2", expires_in: 3600 }),
    );
    const conn = { ...CONN, expiresAt: new Date(Date.now() + 30_000) };
    const { service, sourceConnection } = build({ conn });
    await service.syncList("u-1", "watch");

    const [, init] = providerFetch.mock.calls[0];
    expect(providerFetch.mock.calls[0][0]).toBe(TOKEN_URL);
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      client_id: "mal-id",
      client_secret: "mal-secret",
      grant_type: "refresh_token",
      refresh_token: "ref-1",
    });
    expect(sourceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: {
        accessToken: "tok-2",
        refreshToken: "ref-2",
        expiresAt: new Date("2026-01-01T01:00:00Z"),
      },
    });
    expect(bearerUsed()).toBe("Bearer tok-2");
  });

  it("keeps the old refresh token when upstream does not rotate it", async () => {
    animeOnlyAfterRefresh(json({ access_token: "tok-2" }));
    const conn = { ...CONN, expiresAt: new Date(0) };
    const { service, sourceConnection } = build({ conn });
    await service.syncList("u-1", "watch");
    expect(sourceConnection.update.mock.calls[0][0].data).toEqual({
      accessToken: "tok-2",
      refreshToken: "ref-1",
      expiresAt: null,
    });
  });

  it("uses the stored token when no refresh token exists", async () => {
    animePages();
    const conn = { ...CONN, refreshToken: null, expiresAt: new Date(0) };
    await build({ conn }).service.syncList("u-1", "watch");
    expect(providerFetch.mock.calls.some(([u]) => u === TOKEN_URL)).toBe(false);
    expect(bearerUsed()).toBe("Bearer tok-1");
  });

  it("falls back to the stored token and warns without leaking it on refresh failure", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    animeOnlyAfterRefresh(new Response("invalid_grant", { status: 400 }));
    const conn = { ...CONN, expiresAt: new Date(0) };
    const { service, sourceConnection } = build({ conn });
    await service.syncList("u-1", "watch");
    expect(warn).toHaveBeenCalledWith("MAL refresh failed: 400");
    expect(bearerUsed()).toBe("Bearer tok-1");
    expect(sourceConnection.update).toHaveBeenCalledTimes(1);
    expect(sourceConnection.update.mock.calls[0][0].data).toEqual({
      lastSyncedAt: expect.any(Date),
      lastError: null,
    });
  });
});

describe("MalService anime requests and pagination", () => {
  it("requests the authenticated user's list with auth and fields", async () => {
    animePages();
    await build().service.syncList("u-1", "watch");
    const [url, init] = providerFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://api.myanimelist.net/v2/users/@me/animelist",
    );
    expect(parsed.searchParams.get("limit")).toBe("100");
    expect(parsed.searchParams.get("offset")).toBe("0");
    expect(parsed.searchParams.get("nsfw")).toBe("true");
    expect(parsed.searchParams.get("fields")).toContain("num_episodes_watched");
    expect(init.headers).toEqual({ Authorization: "Bearer tok-1" });
  });

  it("follows paging.next in steps of 100 until it disappears", async () => {
    animePages(
      { data: [entry({}, { id: 1 })], paging: { next: "x" } },
      { data: [entry({}, { id: 2 })], paging: { next: "y" } },
      { data: [entry({}, { id: 3 })], paging: {} },
    );
    const { service, catalog } = build();
    await expect(service.syncList("u-1", "watch")).resolves.toMatchObject({
      accepted: 3,
    });
    expect(
      providerFetch.mock.calls.map(([u]) => new URL(u).searchParams.get("offset")),
    ).toEqual(["0", "100", "200"]);
    expect(catalog.upsertTitle).toHaveBeenCalledTimes(3);
  });

  it("stops on an empty page even when paging.next is set", async () => {
    animePages({ data: [], paging: { next: "x" } });
    await build().service.syncList("u-1", "watch");
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("treats a missing data array as empty", async () => {
    animePages({});
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1", "watch")).resolves.toMatchObject({
      accepted: 0,
    });
    expect(sourceConnection.update).toHaveBeenCalledOnce();
  });
});

describe("MalService sync failures", () => {
  it("surfaces upstream errors with a truncated body and does not mark synced", async () => {
    providerFetch.mockResolvedValue(new Response("y".repeat(500), { status: 429 }));
    const { service, sourceConnection } = build();
    const err = (await service.syncList("u-1", "watch").catch((e) => e)) as Error;
    expect(err.message).toContain(": 429 ");
    expect(err.message).toContain("y".repeat(200));
    expect(err.message).not.toContain("y".repeat(201));
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
    expect(service.isSyncing("u-1")).toBe(false);
  });

  it("keeps earlier pages when a later page fails but does not mark synced", async () => {
    providerFetch
      .mockResolvedValueOnce(json({ data: [entry()], paging: { next: "x" } }))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const { service, catalog, sourceConnection } = build();
    await expect(service.syncList("u-1", "watch")).rejects.toThrow(": 500 ");
    expect(catalog.recordWatch).toHaveBeenCalledOnce();
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });

  it("exposes syncing state per user while in flight", async () => {
    let release!: (r: Response) => void;
    providerFetch.mockImplementationOnce(
      () => new Promise<Response>((r) => (release = r)),
    );
    const { service } = build();
    const pending = service.syncList("u-1", "watch");
    await vi.waitFor(() => expect(providerFetch).toHaveBeenCalled());
    expect(service.isSyncing("u-1")).toBe(true);
    expect(service.isSyncing("u-2")).toBe(false);
    await expect(service.getConnection("u-1")).resolves.toMatchObject({ syncing: true });
    release(json({ data: [] }));
    await pending;
    expect(service.isSyncing("u-1")).toBe(false);
  });
});
