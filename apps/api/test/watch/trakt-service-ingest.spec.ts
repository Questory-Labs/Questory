import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TraktService } from "../../src/watch/trakt/trakt.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

const { providerFetch } = vi.hoisted(() => ({ providerFetch: vi.fn() }));
vi.mock("../../src/lib/qhttp-outbound", () => ({ providerFetch }));

type Handler = (url: URL, init: RequestInit) => Response;

function json(body: unknown, pageCount?: string, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: pageCount ? { "x-pagination-page-count": pageCount } : {},
  });
}

function routeFetch(history: Handler, rest: Handler = () => json([])) {
  providerFetch.mockImplementation(async (url: URL | string, init: RequestInit) => {
    const parsed = new URL(String(url));
    return parsed.pathname === "/sync/history"
      ? history(parsed, init)
      : rest(parsed, init);
  });
}

function setup(
  opts: {
    conn?: Record<string, unknown> | null;
    domainEnabled?: boolean;
    sourceEnabled?: boolean;
    user?: { id: string } | null;
  } = {},
) {
  const conn =
    opts.conn === undefined
      ? { id: "c-1", accessToken: "tok", refreshToken: null, expiresAt: null, syncCursor: null }
      : opts.conn;
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(conn),
    update: vi.fn().mockResolvedValue({}),
  };
  const watchEvent = { findFirst: vi.fn().mockResolvedValue(null) };
  const catalog = {
    upsertTitle: vi.fn().mockResolvedValue({ id: "t-1" }),
    upsertEpisode: vi.fn().mockResolvedValue({ id: "e-1", runtimeMinutes: 42 }),
    recordWatch: vi.fn().mockResolvedValue({}),
    upsertListState: vi.fn().mockResolvedValue({}),
  };
  const enrichment = { enqueueTitle: vi.fn() };
  const users = {
    resolveUser: vi
      .fn()
      .mockResolvedValue(opts.user === undefined ? { id: "u-1" } : opts.user),
  };
  const flags = {
    isDomainEnabled: vi.fn().mockResolvedValue(opts.domainEnabled ?? true),
    isSourceEnabled: vi.fn().mockResolvedValue(opts.sourceEnabled ?? true),
  };
  const service = new TraktService(
    { sourceConnection, watchEvent } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    enrichment as unknown as EnrichmentService,
    users as unknown as UsersService,
    flags as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, watchEvent, catalog, enrichment, users, flags };
}

const movie = {
  id: 1,
  watched_at: "2026-01-01T10:00:00.000Z",
  type: "movie",
  movie: { title: "Heat", year: 1995, ids: { trakt: 11, tmdb: 12, imdb: "tt1" } },
};

const episode = {
  id: 2,
  watched_at: "2026-01-02T10:00:00.000Z",
  type: "episode",
  action: "scrobble",
  show: { title: "Dark", year: 2017, ids: { trakt: 21, tmdb: 22, imdb: "tt2" } },
  episode: { season: 2, number: 3, title: "Ep", ids: { trakt: 31, tmdb: 32 } },
};

describe("TraktService history ingest", () => {
  beforeEach(() => {
    providerFetch.mockReset();
    process.env.TRAKT_CLIENT_ID = "cid";
    process.env.TRAKT_CLIENT_SECRET = "csecret";
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    delete process.env.TRAKT_CLIENT_ID;
    delete process.env.TRAKT_CLIENT_SECRET;
    vi.restoreAllMocks();
  });

  it("ingests a movie", async () => {
    const { service, catalog, enrichment } = setup();
    routeFetch(() => json([movie]));
    await expect(service.syncHistory("u-1")).resolves.toMatchObject({ accepted: 1 });

    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "movie",
      name: "Heat",
      year: 1995,
      traktId: 11,
      tmdbId: 12,
      imdbId: "tt1",
    });
    expect(catalog.upsertEpisode).not.toHaveBeenCalled();
    expect(catalog.recordWatch).toHaveBeenCalledWith({
      userId: "u-1",
      titleId: "t-1",
      watchedAt: new Date(movie.watched_at),
      source: "trakt",
      dedupeKey: "trakt:history:1",
      action: "watch",
      precision: "second",
      rawPayload: JSON.stringify(movie),
    });
    expect(enrichment.enqueueTitle).toHaveBeenCalledWith("t-1");
  });

  it("ingests an episode with its runtime and the upstream action", async () => {
    const { service, catalog } = setup();
    routeFetch(() => json([episode]));
    await service.syncHistory("u-1");

    expect(catalog.upsertTitle.mock.calls[0]![0]).toMatchObject({ type: "show", name: "Dark" });
    expect(catalog.upsertEpisode).toHaveBeenCalledWith({
      titleId: "t-1",
      seasonNumber: 2,
      episodeNumber: 3,
      name: "Ep",
      traktId: 31,
      tmdbId: 32,
    });
    expect(catalog.recordWatch.mock.calls[0]![0]).toMatchObject({
      episodeId: "e-1",
      dedupeKey: "trakt:history:2",
      action: "scrobble",
      runtimeMinutes: 42,
    });
  });

  it("nulls optional movie fields", async () => {
    const { service, catalog } = setup();
    routeFetch(() =>
      json([{ id: 5, watched_at: movie.watched_at, movie: { title: "Bare" } }]),
    );
    await service.syncHistory("u-1");
    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "movie",
      name: "Bare",
      year: null,
      traktId: null,
      tmdbId: null,
      imdbId: null,
    });
  });

  it("defaults missing episode numbering to zero", async () => {
    const { service, catalog } = setup();
    routeFetch(() =>
      json([{ id: 6, watched_at: movie.watched_at, show: { title: "S" }, episode: {} }]),
    );
    await service.syncHistory("u-1");
    expect(catalog.upsertEpisode.mock.calls[0]![0]).toMatchObject({
      seasonNumber: 0,
      episodeNumber: 0,
      name: null,
      traktId: null,
      tmdbId: null,
    });
  });

  it("derives a stable dedupe key when the history id is missing", async () => {
    const { service, catalog } = setup();
    const noIdMovie = { ...movie, id: undefined };
    const noIdEpisode = { ...episode, id: undefined };
    routeFetch(() => json([noIdMovie, noIdEpisode]));
    await service.syncHistory("u-1");
    expect(catalog.recordWatch.mock.calls.map(([a]) => a.dedupeKey)).toEqual([
      `trakt:history:11:${movie.watched_at}`,
      `trakt:history:31:${episode.watched_at}`,
    ]);
  });

  it("uses the same dedupe key when an item is synced twice", async () => {
    const { service, catalog } = setup();
    routeFetch(() => json([movie]));
    await service.syncHistory("u-1");
    await service.syncHistory("u-1");
    const [first, second] = catalog.recordWatch.mock.calls.map(([a]) => a.dedupeKey);
    expect(first).toBe(second);
  });

  it.each([
    ["no watched_at", { id: 1, movie: { title: "x" } }],
    ["unparseable watched_at", { id: 1, watched_at: "nope", movie: { title: "x" } }],
    ["movie type without movie", { id: 1, watched_at: movie.watched_at, type: "movie" }],
    ["untitled movie", { id: 1, watched_at: movie.watched_at, movie: {} }],
    ["episode without show", { id: 1, watched_at: movie.watched_at, episode: { number: 1 } }],
    ["untitled show", { id: 1, watched_at: movie.watched_at, show: {}, episode: { number: 1 } }],
    ["episode type without episode", { id: 1, watched_at: movie.watched_at, type: "episode", show: { title: "x" } }],
    ["unknown type", { id: 1, watched_at: movie.watched_at, type: "season" }],
  ])("skips %s without counting it", async (_name, item) => {
    const { service, catalog } = setup();
    routeFetch(() => json([item, movie]));
    await expect(service.syncHistory("u-1")).resolves.toMatchObject({ accepted: 1 });
    expect(catalog.recordWatch).toHaveBeenCalledTimes(1);
  });

  it("accepts nothing from an empty history", async () => {
    const { service, catalog } = setup();
    routeFetch(() => json([]));
    await expect(service.syncHistory("u-1")).resolves.toEqual({
      ok: true,
      accepted: 0,
      userId: "u-1",
    });
    expect(catalog.recordWatch).not.toHaveBeenCalled();
  });

  it("stores ratings as list state without recording watches", async () => {
    const { service, catalog, enrichment } = setup();
    routeFetch(
      () => json([]),
      (url) => {
        if (url.pathname === "/sync/ratings/movies") {
          return json([
            { rated_at: "2026-01-05T00:00:00Z", rating: 9, movie: movie.movie },
            { rated_at: "2026-01-05T00:00:00Z", rating: 1, movie: {} },
          ]);
        }
        if (url.pathname === "/sync/ratings/shows") {
          return json([{ show: episode.show }]);
        }
        return json([]);
      },
    );
    await service.syncHistory("u-1");

    expect(catalog.upsertListState.mock.calls.map(([a]) => a)).toEqual([
      {
        userId: "u-1",
        titleId: "t-1",
        listType: "rating",
        source: "trakt",
        rating: 9,
        listedAt: new Date("2026-01-05T00:00:00Z"),
      },
      {
        userId: "u-1",
        titleId: "t-1",
        listType: "rating",
        source: "trakt",
        rating: null,
        listedAt: null,
      },
    ]);
    expect(catalog.upsertTitle.mock.calls.map(([a]) => a.type)).toEqual(["movie", "show"]);
    expect(enrichment.enqueueTitle).toHaveBeenCalledTimes(2);
    expect(catalog.recordWatch).not.toHaveBeenCalled();
  });

  it("stores watchlist rows as list state", async () => {
    const { service, catalog } = setup();
    routeFetch(
      () => json([]),
      (url) => {
        if (url.pathname === "/sync/watchlist/shows") {
          return json([
            { listed_at: "2026-01-06T00:00:00Z", show: episode.show },
            { show: {} },
          ]);
        }
        return json([]);
      },
    );
    await service.syncHistory("u-1");
    expect(catalog.upsertListState).toHaveBeenCalledTimes(1);
    expect(catalog.upsertListState).toHaveBeenCalledWith({
      userId: "u-1",
      titleId: "t-1",
      listType: "watchlist",
      source: "trakt",
      listedAt: new Date("2026-01-06T00:00:00Z"),
    });
    expect(catalog.upsertTitle.mock.calls[0]![0].type).toBe("show");
  });
});
