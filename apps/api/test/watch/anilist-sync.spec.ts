import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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

const GQL = "https://graphql.anilist.co";
const CONN = { id: "conn-1", accessToken: "tok-1", lastSyncedAt: null };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function route(handlers: { viewer?: () => Response; anime?: () => Response; manga?: () => Response }) {
  providerFetch.mockImplementation(async (_url: string, init: { body: string }) => {
    const query = JSON.parse(init.body).query as string;
    if (query.includes("type: ANIME")) {
      return handlers.anime?.() ?? json({ data: { MediaListCollection: { lists: [] } } });
    }
    if (query.includes("type: MANGA")) {
      return handlers.manga?.() ?? json({ data: { MediaListCollection: { lists: [] } } });
    }
    return handlers.viewer?.() ?? json({ data: { Viewer: { id: 777, name: "v" } } });
  });
}

function animeLists(...entries: unknown[]) {
  return () => json({ data: { MediaListCollection: { lists: [{ entries }] } } });
}

function entry(overrides: Record<string, unknown> = {}, media: Record<string, unknown> = {}) {
  return {
    id: 10,
    status: "COMPLETED",
    score: 0,
    progress: 12,
    updatedAt: 1_700_000_000,
    media: {
      id: 100,
      idMal: 200,
      title: { english: "English", romaji: "Romaji", native: "Native" },
      seasonYear: 2020,
      episodes: 12,
      duration: 24,
      genres: [],
      format: "TV",
      ...media,
    },
    ...overrides,
  };
}

function build(opts: { conn?: unknown; user?: { id: string } | null; watch?: boolean; read?: boolean; source?: boolean } = {}) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(opts.conn === undefined ? CONN : opts.conn),
    update: vi.fn().mockResolvedValue({}),
  };
  const catalog = {
    upsertTitle: vi.fn(async (i: { anilistId: number }) => ({ id: `t-${i.anilistId}` })),
    linkGenres: vi.fn().mockResolvedValue(undefined),
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
    isDomainEnabled: vi.fn(async (d: string) =>
      d === "watch" ? (opts.watch ?? true) : (opts.read ?? false),
    ),
  };
  const service = new AnilistService(
    { sourceConnection } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    enrichment as unknown as EnrichmentService,
    users as unknown as UsersService,
    { upsertTitle: vi.fn(), linkGenres: vi.fn(), upsertListState: vi.fn(), recordProgress: vi.fn() } as unknown as ReadCatalogService,
    flags as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, catalog, enrichment, users, flags };
}

function sentQueries() {
  return providerFetch.mock.calls.map(([, init]) => JSON.parse(init.body).query as string);
}

beforeEach(() => {
  providerFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AnilistService.syncList preconditions", () => {
  it("skips without any lookups when the source is off", async () => {
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

  it("skips when the requested scope's domain is off", async () => {
    const { service } = build({ watch: false, read: true });
    await expect(service.syncList("u-1", "watch")).resolves.toMatchObject({
      skipped: true,
    });
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown user", async () => {
    await expect(build({ user: null }).service.syncList("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects a user who never connected", async () => {
    await expect(build({ conn: null }).service.syncList("u-1")).rejects.toThrow(
      "AniList not connected",
    );
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("loads the connection of the resolved user", async () => {
    route({});
    const { service, sourceConnection } = build({ user: { id: "canonical" } });
    await service.syncList("alias");
    expect(sourceConnection.findUnique).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "canonical", provider: "anilist" } },
    });
  });
});

describe("AnilistService.syncList requests", () => {
  it("authenticates every call with the connection token", async () => {
    route({});
    await build({ read: true }).service.syncList("u-1");
    expect(providerFetch).toHaveBeenCalledTimes(3);
    for (const [url, init] of providerFetch.mock.calls) {
      expect(url).toBe(GQL);
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: "Bearer tok-1",
        "Content-Type": "application/json",
      });
    }
  });

  it("resolves the viewer first and scopes lists to that viewer", async () => {
    route({});
    await build({ read: true }).service.syncList("u-1");
    const [viewer, anime, manga] = sentQueries();
    expect(viewer).toContain("Viewer");
    expect(anime).toContain("type: ANIME, userId: 777");
    expect(anime).not.toContain("userId: 0");
    expect(manga).toContain("type: MANGA, userId: 777");
  });

  it("excludes planning entries from the anime query", async () => {
    route({});
    await build().service.syncList("u-1");
    expect(sentQueries()[1]).toContain("status_not: PLANNING");
  });

  it("fetches only anime for watch scope", async () => {
    route({});
    await build({ read: true }).service.syncList("u-1", "watch");
    expect(sentQueries().some((q) => q.includes("type: MANGA"))).toBe(false);
  });

  it("fetches only manga for read scope", async () => {
    route({});
    await build({ read: true }).service.syncList("u-1", "read");
    expect(sentQueries().some((q) => q.includes("type: ANIME"))).toBe(false);
    expect(sentQueries().some((q) => q.includes("type: MANGA"))).toBe(true);
  });

  it("drops the manga half when read is disabled", async () => {
    route({});
    await build({ read: false }).service.syncList("u-1", "both");
    expect(sentQueries().some((q) => q.includes("type: MANGA"))).toBe(false);
  });
});

describe("AnilistService.syncList completion and failures", () => {
  it("records the sync time and viewer id on the caller's connection", async () => {
    route({ anime: animeLists(entry()) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).resolves.toEqual({
      ok: true,
      accepted: 1,
      mangaAccepted: 0,
      userId: "u-1",
    });
    expect(sourceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { lastSyncedAt: expect.any(Date), lastError: null, externalUserId: "777" },
    });
  });

  it.each([
    ["empty lists", { data: { MediaListCollection: { lists: [] } } }],
    ["null collection", { data: { MediaListCollection: null } }],
  ])("treats %s as an empty sync", async (_label, body) => {
    route({ anime: () => json(body) });
    const { service, catalog, sourceConnection } = build();
    await expect(service.syncList("u-1")).resolves.toMatchObject({ accepted: 0 });
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
    expect(sourceConnection.update).toHaveBeenCalledOnce();
  });

  it.each([
    ["no viewer", () => json({ data: { Viewer: null } })],
    ["errors with no data", () => json({ errors: [{ message: "nope" }], data: null })],
  ])("rejects on %s before fetching lists", async (_label, viewer) => {
    route({ viewer });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow("AniList Viewer missing");
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });

  it("reports a revoked token by HTTP status before fetching lists", async () => {
    route({ viewer: () => json({ errors: [{ message: "Invalid token" }], data: null }, 401) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow(
      "AniList viewer request failed (401)",
    );
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });

  it("rejects on a non-JSON viewer response", async () => {
    route({ viewer: () => new Response("Service Unavailable", { status: 503 }) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow();
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
    expect(service.isSyncing("u-1")).toBe(false);
  });

  it("surfaces anime GraphQL errors, truncated, without marking synced", async () => {
    const message = "x".repeat(1000);
    route({ anime: () => json({ errors: [{ message }] }) });
    const { service, sourceConnection } = build();
    const err = await service.syncList("u-1").catch((e: Error) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as Error).message.length).toBeLessThanOrEqual(
      "AniList GraphQL error: ".length + 300,
    );
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });

  it("rejects a malformed list and clears the syncing flag", async () => {
    route({ anime: () => json({ data: { MediaListCollection: { lists: [{}] } } }) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow();
    expect(service.isSyncing("u-1")).toBe(false);
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });

  it("propagates catalog failures and clears the syncing flag", async () => {
    route({ anime: animeLists(entry()) });
    const { service, catalog } = build();
    catalog.upsertTitle.mockRejectedValue(new Error("db down"));
    await expect(service.syncList("u-1")).rejects.toThrow("db down");
    expect(service.isSyncing("u-1")).toBe(false);
  });

  it("exposes syncing state per user while in flight", async () => {
    let release!: (r: Response) => void;
    providerFetch.mockImplementationOnce(
      () => new Promise<Response>((r) => (release = r)),
    );
    const { service } = build();
    const pending = service.syncList("u-1");
    await vi.waitFor(() => expect(providerFetch).toHaveBeenCalled());
    expect(service.isSyncing("u-1")).toBe(true);
    expect(service.isSyncing("u-2")).toBe(false);
    await expect(service.getConnection("u-1")).resolves.toMatchObject({ syncing: true });
    route({});
    release(json({ data: { Viewer: { id: 777, name: "v" } } }));
    await pending;
    expect(service.isSyncing("u-1")).toBe(false);
  });
});
