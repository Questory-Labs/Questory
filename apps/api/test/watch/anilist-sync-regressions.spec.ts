import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, Logger } from "@nestjs/common";
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

const CONN = { id: "conn-1", accessToken: "tok-1" };
const EMPTY = { data: { MediaListCollection: { lists: [] } } };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function route(handlers: { viewer?: () => Response; anime?: () => Response; manga?: () => Response }) {
  providerFetch.mockImplementation(async (_url: string, init: { body: string }) => {
    const query = JSON.parse(init.body).query as string;
    if (query.includes("type: ANIME")) return handlers.anime?.() ?? json(EMPTY);
    if (query.includes("type: MANGA")) return handlers.manga?.() ?? json(EMPTY);
    return handlers.viewer?.() ?? json({ data: { Viewer: { id: 777, name: "v" } } });
  });
}

function lists(...groups: unknown[][]) {
  return () =>
    json({
      data: { MediaListCollection: { lists: groups.map((entries) => ({ entries })) } },
    });
}

function anime(overrides: Record<string, unknown> = {}, media: Record<string, unknown> = {}) {
  return {
    id: 10,
    status: "CURRENT",
    score: 0,
    progress: 6,
    updatedAt: 1_700_000_000,
    media: {
      id: 100,
      title: { english: "English" },
      episodes: 12,
      format: "TV",
      ...media,
    },
    ...overrides,
  };
}

function manga(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    status: "CURRENT",
    score: 0,
    progress: 5,
    updatedAt: 1_700_000_000,
    media: { id: 200, title: { english: "Manga" }, chapters: 20, format: "MANGA" },
    ...overrides,
  };
}

function build(opts: { watch?: boolean; read?: boolean } = {}) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(CONN),
    update: vi.fn().mockResolvedValue({}),
  };
  const catalog = {
    upsertTitle: vi.fn(async (i: { anilistId: number }) => ({ id: `t-${i.anilistId}` })),
    linkGenres: vi.fn().mockResolvedValue(undefined),
    recordWatch: vi.fn().mockResolvedValue({}),
    upsertListState: vi.fn().mockResolvedValue({}),
    syncDroppedListState: vi.fn().mockResolvedValue(undefined),
  };
  const readCatalog = {
    upsertTitle: vi.fn(async (i: { anilistId: number }) => ({ id: `r-${i.anilistId}` })),
    linkGenres: vi.fn().mockResolvedValue(undefined),
    upsertListState: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  };
  const service = new AnilistService(
    { sourceConnection } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
    { resolveUser: vi.fn().mockResolvedValue({ id: "u-1" }) } as unknown as UsersService,
    readCatalog as unknown as ReadCatalogService,
    {
      isSourceEnabled: vi.fn().mockResolvedValue(true),
      isDomainEnabled: vi.fn(async (d: string) =>
        d === "watch" ? (opts.watch ?? true) : (opts.read ?? true),
      ),
    } as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, catalog, readCatalog };
}

function writes(sourceConnection: { update: ReturnType<typeof vi.fn> }) {
  return sourceConnection.update.mock.calls.map(([a]) => a.data as Record<string, unknown>);
}

function expectFailureRecorded(sourceConnection: { update: ReturnType<typeof vi.fn> }, text: string) {
  const data = writes(sourceConnection);
  expect(data.some((d) => "lastSyncedAt" in d)).toBe(false);
  expect(String(data.at(-1)?.lastError)).toContain(text);
}

function sentQueries() {
  return providerFetch.mock.calls.map(([, init]) => JSON.parse(init.body).query as string);
}

beforeEach(() => {
  providerFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AniList score format", () => {
  it("requests decimal scores for both anime and manga", async () => {
    route({});
    await build().service.syncList("u-1");
    const queries = sentQueries().filter((q) => q.includes("MediaListCollection"));
    expect(queries).toHaveLength(2);
    for (const query of queries) {
      expect(query).toContain("score(format: POINT_10_DECIMAL)");
    }
  });
});

describe("AniList anime entry handling", () => {
  it("reports a completed entry as 100 even when its progress is zero", async () => {
    route({ anime: lists([anime({ status: "COMPLETED", progress: 0 })]) });
    const { service, catalog } = build({ read: false });
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[0][0].progress).toBe(100);
  });

  it("reports a completed entry as 100 when progress is below the episode count", async () => {
    route({ anime: lists([anime({ status: "COMPLETED", progress: 3 })]) });
    const { service, catalog } = build({ read: false });
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[0][0].progress).toBe(100);
  });

  it("records a rewatch that has no progress yet", async () => {
    route({ anime: lists([anime({ status: "REPEATING", progress: 0 })]) });
    const { service, catalog } = build({ read: false });
    await expect(service.syncList("u-1")).resolves.toMatchObject({ accepted: 1 });
    expect(catalog.recordWatch).toHaveBeenCalledOnce();
  });

  it("counts an entry once when it appears in a status list and a custom list", async () => {
    route({
      anime: lists([anime()], [anime()], [anime({ id: 11 }, { id: 101 })]),
    });
    const { service, catalog } = build({ read: false });
    await expect(service.syncList("u-1")).resolves.toMatchObject({ accepted: 2 });
    expect(catalog.upsertTitle).toHaveBeenCalledTimes(2);
    expect(catalog.recordWatch).toHaveBeenCalledTimes(2);
  });
});

describe("AniList manga entry handling", () => {
  it("counts an entry once when it appears in a status list and a custom list", async () => {
    route({ manga: lists([manga()], [manga()]) });
    const { service, readCatalog } = build({ watch: false });
    await expect(service.syncList("u-1")).resolves.toMatchObject({ mangaAccepted: 1 });
    expect(readCatalog.recordProgress).toHaveBeenCalledOnce();
  });

  it("hands the absolute progress to the catalog as a total", async () => {
    route({ manga: lists([manga({ progress: 7 })]) });
    const { service, readCatalog } = build({ watch: false });
    await service.syncList("u-1");
    const arg = readCatalog.recordProgress.mock.calls[0][0];
    expect(arg.chaptersTotal).toBe(7);
    expect(arg).not.toHaveProperty("chaptersDelta");
  });
});

describe("AniList failed responses", () => {
  it.each([
    ["viewer", { viewer: () => new Response("down", { status: 503 }) }, "viewer request failed (503): down"],
    ["anime list", { anime: () => new Response("down", { status: 500 }) }, "anime list request failed (500): down"],
    ["manga list", { manga: () => new Response("down", { status: 500 }) }, "manga list request failed (500): down"],
  ])("rejects a failed %s request and records it", async (_label, handlers, text) => {
    route(handlers);
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toBeInstanceOf(BadRequestException);
    expectFailureRecorded(sourceConnection, text);
    expect(service.isSyncing("u-1")).toBe(false);
  });

  it("truncates an upstream body in the error", async () => {
    route({ viewer: () => new Response("y".repeat(500), { status: 503 }) });
    const err = (await build().service.syncList("u-1").catch((e) => e)) as Error;
    expect(err.message).toContain("y".repeat(200));
    expect(err.message).not.toContain("y".repeat(201));
  });

  it("rejects an anime response with no data instead of syncing nothing", async () => {
    route({ anime: () => json({}) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow("anime list response missing data");
    expectFailureRecorded(sourceConnection, "missing data");
  });

  it("rejects a manga response with no data instead of syncing nothing", async () => {
    route({ manga: () => json({}) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow("manga list response missing data");
    expectFailureRecorded(sourceConnection, "missing data");
  });

  it("rejects manga GraphQL errors and does not mark synced", async () => {
    route({ manga: () => json({ errors: [{ message: "rate limited" }] }) });
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1")).rejects.toThrow("AniList manga GraphQL error");
    expectFailureRecorded(sourceConnection, "rate limited");
  });
});

describe("AniList lastError", () => {
  it("clears a previous error on success", async () => {
    route({});
    const { service, sourceConnection } = build();
    await service.syncList("u-1");
    expect(writes(sourceConnection)).toEqual([
      { lastSyncedAt: expect.any(Date), lastError: null, externalUserId: "777" },
    ]);
  });

  it("targets the caller's connection when recording a failure", async () => {
    route({ viewer: () => json({ data: {} }) });
    const { service, sourceConnection } = build();
    await service.syncList("u-1").catch(() => undefined);
    expect(sourceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { lastError: "AniList Viewer missing" },
    });
  });

  it("caps the stored message", async () => {
    route({ anime: lists([anime()]) });
    const { service, sourceConnection, catalog } = build();
    catalog.upsertTitle.mockRejectedValue(new Error("z".repeat(1000)));
    await service.syncList("u-1").catch(() => undefined);
    expect(String(writes(sourceConnection)[0].lastError)).toHaveLength(300);
  });

  it("does not store database error text", async () => {
    route({ anime: lists([anime()]) });
    const { service, sourceConnection, catalog } = build();
    const dbError = Object.assign(new Error("Invalid invocation accessToken: tok-1"), {
      name: "PrismaClientValidationError",
    });
    catalog.upsertTitle.mockRejectedValue(dbError);
    await expect(service.syncList("u-1")).rejects.toBe(dbError);
    expect(writes(sourceConnection)).toEqual([{ lastError: "Sync failed" }]);
  });

  it("stores a generic message for a non-Error rejection", async () => {
    route({ anime: lists([anime()]) });
    const { service, sourceConnection, catalog } = build();
    catalog.upsertTitle.mockRejectedValue("boom");
    await expect(service.syncList("u-1")).rejects.toBe("boom");
    expect(writes(sourceConnection)).toEqual([{ lastError: "Sync failed" }]);
  });

  it("keeps the original error when writing lastError fails", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    route({ viewer: () => json({ data: {} }) });
    const { service, sourceConnection } = build();
    sourceConnection.update.mockRejectedValue(new Error("db down"));
    await expect(service.syncList("u-1")).rejects.toThrow("AniList Viewer missing");
    expect(warn).toHaveBeenCalledWith("AniList lastError write failed: db down");
    expect(service.isSyncing("u-1")).toBe(false);
  });
});
