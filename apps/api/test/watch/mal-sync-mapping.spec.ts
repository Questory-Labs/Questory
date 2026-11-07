import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    upsertTitle: vi.fn(async (i: { malId: number } & Record<string, unknown>) => ({ id: `t-${i.malId}` })),
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

describe("MalService anime mapping", () => {
  it("upserts catalog fields", async () => {
    animePages({ data: [entry()] });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Title",
        year: 2020,
        malId: 100,
        posterUrl: "https://img/l",
        runtimeMinutes: null,
      }),
    );
  });

  it.each([
    [undefined, null],
    ["", null],
    ["unknown", null],
    ["2004", 2004],
  ])("parses start_date %j to year %j", async (start_date, year) => {
    animePages({ data: [entry({}, { start_date })] });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.upsertTitle.mock.calls[0][0].year).toBe(year);
  });

  it("falls back through poster sizes", async () => {
    animePages({
      data: [
        entry({}, { id: 1, main_picture: { medium: "https://img/m" } }),
        entry({}, { id: 2, main_picture: undefined }),
      ],
    });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.upsertTitle.mock.calls[0][0].posterUrl).toBe("https://img/m");
    expect(catalog.upsertTitle.mock.calls[1][0].posterUrl).toBeNull();
  });

  it.each([
    ["completed", 0, true],
    ["watching", 0, true],
    ["on_hold", 3, true],
    ["dropped", 1, true],
    ["on_hold", 0, false],
    ["dropped", 0, false],
    ["plan_to_watch", 0, false],
  ])("status %s with %i episodes records a watch: %s", async (status, num, expected) => {
    animePages({ data: [entry({ status, num_episodes_watched: num })] });
    const { service, catalog, enrichment } = build();
    const result = await service.syncList("u-1", "watch");
    expect(catalog.recordWatch).toHaveBeenCalledTimes(expected ? 1 : 0);
    expect(result).toMatchObject({ accepted: expected ? 1 : 0 });
    expect(enrichment.enqueueTitle).toHaveBeenCalledWith("t-100");
  });

  it("defaults a missing list_status to planned with no watch", async () => {
    animePages({ data: [{ node: entry().node }] });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.recordWatch).not.toHaveBeenCalled();
    expect(catalog.syncDroppedListState.mock.calls[0][0].dropped).toBe(false);
  });

  it("records the watch for the user with a stable dedupe key", async () => {
    const page = { data: [entry({ status: "watching", num_episodes_watched: 6, score: 7 })] };
    animePages(page, page);
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    await service.syncList("u-1", "watch");
    const [first, second] = catalog.recordWatch.mock.calls.map(([a]) => a);
    expect(first).toMatchObject({
      userId: "u-1",
      titleId: "t-100",
      source: "mal",
      action: "import",
      dedupeKey: "mal:list:100:watching:6",
      progress: 50,
      rating: 7,
      precision: "unknown",
    });
    expect(second.dedupeKey).toBe(first.dedupeKey);
  });

  it("prefers finish_date with day precision", async () => {
    animePages({ data: [entry({ finish_date: "2021-06-07" })] });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    const arg = catalog.recordWatch.mock.calls[0][0];
    expect(arg.watchedAt).toEqual(new Date("2021-06-07"));
    expect(arg.precision).toBe("day");
  });

  it("stores a rating state only when scored", async () => {
    animePages({
      data: [entry({ score: 9 }, { id: 1 }), entry({ score: 0 }, { id: 2 })],
    });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.upsertListState).toHaveBeenCalledTimes(1);
    expect(catalog.upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        titleId: "t-1",
        listType: "rating",
        source: "mal",
        rating: 9,
      }),
    );
  });

  it("marks dropped entries", async () => {
    animePages({ data: [entry({ status: "dropped", num_episodes_watched: 0 })] });
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.syncDroppedListState).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-1", source: "mal", dropped: true }),
    );
  });
});
