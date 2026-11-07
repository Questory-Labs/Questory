import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    upsertTitle: vi.fn(async (i: { anilistId: number } & Record<string, unknown>) => ({ id: `t-${i.anilistId}` })),
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

beforeEach(() => {
  providerFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AnilistService.syncList anime mapping", () => {
  it.each([
    [{ english: "E", romaji: "R", native: "N" }, "E"],
    [{ english: null, romaji: "R", native: "N" }, "R"],
    [{ english: "", romaji: "", native: "N" }, "N"],
    [{ english: null, romaji: null, native: null }, "AniList 100"],
  ])("resolves the title name from %j", async (title, name) => {
    route({ anime: animeLists(entry({}, { title })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.upsertTitle.mock.calls[0][0].name).toBe(name);
  });

  it("upserts catalog fields and treats MOVIE as a movie", async () => {
    route({ anime: animeLists(entry({}, { format: "MOVIE" })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "movie",
      name: "English",
      year: 2020,
      anilistId: 100,
      malId: 200,
      runtimeMinutes: 24,
    });
  });

  it("treats other formats as shows and tolerates missing metadata", async () => {
    route({
      anime: animeLists(
        entry({}, { format: "ONA", idMal: undefined, seasonYear: undefined, duration: undefined }),
      ),
    });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "show",
      name: "English",
      year: null,
      anilistId: 100,
      malId: null,
      runtimeMinutes: null,
    });
  });

  it("links genres only when present", async () => {
    route({
      anime: animeLists(
        entry({ id: 1 }, { id: 1, genres: ["Action", "Drama"] }),
        entry({ id: 2 }, { id: 2, genres: [] }),
        entry({ id: 3 }, { id: 3, genres: undefined }),
      ),
    });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.linkGenres).toHaveBeenCalledTimes(1);
    expect(catalog.linkGenres).toHaveBeenCalledWith("t-1", ["Action", "Drama"], "anilist");
  });

  it.each([
    ["COMPLETED", 0, true],
    ["CURRENT", 0, true],
    ["PAUSED", 3, true],
    ["DROPPED", 2, true],
    ["PAUSED", 0, false],
    ["DROPPED", 0, false],
    ["REPEATING", 4, true],
  ])("status %s with progress %i records a watch: %s", async (status, progress, expected) => {
    route({ anime: animeLists(entry({ status, progress })) });
    const { service, catalog } = build();
    const result = await service.syncList("u-1");
    expect(catalog.recordWatch).toHaveBeenCalledTimes(expected ? 1 : 0);
    expect(result).toMatchObject({ accepted: expected ? 1 : 0 });
  });

  it("writes the watch for the syncing user with a stable dedupe key", async () => {
    route({ anime: animeLists(entry({ id: 42, status: "CURRENT", progress: 6 })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    await service.syncList("u-1");
    const [first, second] = catalog.recordWatch.mock.calls.map(([arg]) => arg);
    expect(first).toMatchObject({
      userId: "u-1",
      titleId: "t-100",
      source: "anilist",
      action: "import",
      dedupeKey: "anilist:list:42:CURRENT:6",
      runtimeMinutes: 24,
    });
    expect(second.dedupeKey).toBe(first.dedupeKey);
  });

  it("changes the dedupe key when progress advances", async () => {
    route({ anime: animeLists(entry({ id: 42, status: "CURRENT", progress: 6 })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    route({ anime: animeLists(entry({ id: 42, status: "CURRENT", progress: 7 })) });
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[1][0].dedupeKey).toBe(
      "anilist:list:42:CURRENT:7",
    );
  });

  it.each([
    ["CURRENT", 6, 12, 50],
    ["CURRENT", 1, 3, 33],
    ["CURRENT", 20, 12, 100],
    ["COMPLETED", 12, 12, 100],
    ["COMPLETED", 5, null, 100],
    ["COMPLETED", 5, 0, 100],
    ["CURRENT", 5, null, 50],
    ["CURRENT", 5, 0, 50],
  ])("%s %i of %s episodes is %i%%", async (status, progress, episodes, percent) => {
    route({ anime: animeLists(entry({ status, progress }, { episodes })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[0][0].progress).toBe(percent);
  });

  it("uses completedAt at UTC noon with day precision", async () => {
    route({ anime: animeLists(entry({ completedAt: { year: 2021, month: 3, day: 9 } })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    const arg = catalog.recordWatch.mock.calls[0][0];
    expect(arg.watchedAt.toISOString()).toBe("2021-03-09T12:00:00.000Z");
    expect(arg.precision).toBe("day");
  });

  it("defaults a year-only completedAt to January first", async () => {
    route({ anime: animeLists(entry({ completedAt: { year: 2021, month: null, day: null } })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[0][0].watchedAt.toISOString()).toBe(
      "2021-01-01T12:00:00.000Z",
    );
  });

  it("falls back to updatedAt seconds with unknown precision", async () => {
    route({
      anime: animeLists(
        entry({ completedAt: { year: null }, updatedAt: 1_700_000_000 }),
      ),
    });
    const { service, catalog } = build();
    await service.syncList("u-1");
    const arg = catalog.recordWatch.mock.calls[0][0];
    expect(arg.watchedAt).toEqual(new Date(1_700_000_000_000));
    expect(arg.precision).toBe("unknown");
  });

  it("falls back to now when no date is available", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-05-05T00:00:00Z") });
    route({ anime: animeLists(entry({ updatedAt: undefined })) });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.recordWatch.mock.calls[0][0].watchedAt).toEqual(
      new Date("2026-05-05T00:00:00Z"),
    );
  });

  it("stores a rating state only when scored", async () => {
    route({
      anime: animeLists(
        entry({ id: 1, score: 8 }, { id: 1 }),
        entry({ id: 2, score: 0 }, { id: 2 }),
      ),
    });
    const { service, catalog } = build();
    await service.syncList("u-1");
    expect(catalog.upsertListState).toHaveBeenCalledTimes(1);
    expect(catalog.upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        titleId: "t-1",
        listType: "rating",
        source: "anilist",
        rating: 8,
      }),
    );
    expect(catalog.recordWatch.mock.calls[0][0].rating).toBe(8);
    expect(catalog.recordWatch.mock.calls[1][0].rating).toBeNull();
  });

  it("syncs dropped state both ways", async () => {
    route({
      anime: animeLists(
        entry({ id: 1, status: "DROPPED", progress: 0 }, { id: 1 }),
        entry({ id: 2, status: "COMPLETED" }, { id: 2 }),
      ),
    });
    const { service, catalog } = build();
    await service.syncList("u-1");
    const calls = catalog.syncDroppedListState.mock.calls.map(([a]) => a);
    expect(calls[0]).toMatchObject({ userId: "u-1", titleId: "t-1", source: "anilist", dropped: true });
    expect(calls[1]).toMatchObject({ titleId: "t-2", dropped: false });
  });

  it("enqueues enrichment for every entry, including unwatched ones", async () => {
    route({
      anime: animeLists(
        entry({ id: 1, status: "PAUSED", progress: 0 }, { id: 1 }),
        entry({ id: 2 }, { id: 2 }),
      ),
    });
    const { service, enrichment } = build();
    await service.syncList("u-1");
    expect(enrichment.enqueueTitle.mock.calls.flat()).toEqual(["t-1", "t-2"]);
  });

  it("walks entries across multiple lists", async () => {
    route({
      anime: () =>
        json({
          data: {
            MediaListCollection: {
              lists: [
                { entries: [entry({ id: 1 }, { id: 1 })] },
                { entries: [] },
                { entries: [entry({ id: 2 }, { id: 2 })] },
              ],
            },
          },
        }),
    });
    const { service, catalog } = build();
    await expect(service.syncList("u-1")).resolves.toMatchObject({ accepted: 2 });
    expect(catalog.upsertTitle).toHaveBeenCalledTimes(2);
  });
});
