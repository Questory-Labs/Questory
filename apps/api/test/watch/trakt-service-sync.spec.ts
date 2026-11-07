import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TraktService } from "../../src/watch/trakt/trakt.service";
import { TRAKT_MAX_PAGES } from "../../src/watch/trakt/trakt.constants";
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

describe("TraktService.syncHistory", () => {
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
    vi.useRealTimers();
  });

  describe("gating", () => {
    it("skips without network when the watch domain is off", async () => {
      const { service, users } = setup({ domainEnabled: false });
      await expect(service.syncHistory("u-1")).resolves.toEqual({
        ok: true,
        skipped: true,
        accepted: 0,
      });
      expect(users.resolveUser).not.toHaveBeenCalled();
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it("skips without network when the trakt source is off", async () => {
      const { service, flags } = setup({ sourceEnabled: false });
      await expect(service.syncHistory("u-1")).resolves.toMatchObject({ skipped: true });
      expect(flags.isSourceEnabled).toHaveBeenCalledWith("trakt");
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it("rejects an unknown user", async () => {
      const { service } = setup({ user: null });
      await expect(service.syncHistory("x")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects when trakt is not connected and clears the syncing flag", async () => {
      const { service } = setup({ conn: null });
      await expect(service.syncHistory("u-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(service.isSyncing("u-1")).toBe(false);
      expect(providerFetch).not.toHaveBeenCalled();
    });
  });

  describe("requests", () => {
    it("sends the Trakt headers and query", async () => {
      const { service } = setup();
      routeFetch(() => json([]));
      await service.syncHistory("u-1");

      const [url, init] = providerFetch.mock.calls[0]!;
      const parsed = new URL(String(url));
      expect(parsed.origin + parsed.pathname).toBe("https://api.trakt.tv/sync/history");
      expect(Object.fromEntries(parsed.searchParams)).toEqual({
        page: "1",
        limit: "100",
        extended: "full",
      });
      expect(init.headers).toEqual({
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": "cid",
        Authorization: "Bearer tok",
      });
    });

    it("resumes from the stored cursor", async () => {
      const { service } = setup({
        conn: { id: "c", accessToken: "tok", expiresAt: null, syncCursor: "2026-01-01T00:00:00.000Z" },
      });
      routeFetch(() => json([]));
      await service.syncHistory("u-1");
      const parsed = new URL(String(providerFetch.mock.calls[0]![0]));
      expect(parsed.searchParams.get("start_at")).toBe("2026-01-01T00:00:00.000Z");
    });

    it("walks every page reported by the pagination header", async () => {
      const { service, catalog } = setup();
      const pages: string[] = [];
      routeFetch((url) => {
        pages.push(url.searchParams.get("page")!);
        return json([{ ...movie, id: Number(url.searchParams.get("page")) }], "3");
      });
      await expect(service.syncHistory("u-1")).resolves.toEqual({
        ok: true,
        accepted: 3,
        userId: "u-1",
      });
      expect(pages).toEqual(["1", "2", "3"]);
      expect(catalog.recordWatch).toHaveBeenCalledTimes(3);
    });

    it.each(["garbage", "0"])("treats page count header %s as one page", async (header) => {
      const { service } = setup();
      let calls = 0;
      routeFetch(() => {
        calls += 1;
        return json([], header);
      });
      await service.syncHistory("u-1");
      expect(calls).toBe(1);
    });

    it("pulls ratings and watchlists for movies and shows", async () => {
      const { service } = setup();
      const paths: string[] = [];
      routeFetch(
        () => json([]),
        (url) => {
          paths.push(`${url.pathname}?limit=${url.searchParams.get("limit")}`);
          return json([]);
        },
      );
      await service.syncHistory("u-1");
      expect(paths).toEqual([
        "/sync/ratings/movies?limit=100",
        "/sync/ratings/shows?limit=100",
        "/sync/watchlist/movies?limit=100",
        "/sync/watchlist/shows?limit=100",
      ]);
    });
  });

  describe("bounds", () => {
    it("bounds every Trakt request with a timeout signal", async () => {
      const { service } = setup();
      routeFetch(() => json([]));
      await service.syncHistory("u-1");
      expect(providerFetch).toHaveBeenCalledTimes(5);
      for (const [, init] of providerFetch.mock.calls) {
        expect(init.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it("stops at the page cap and keeps the previous cursor", async () => {
      const { service, sourceConnection, watchEvent } = setup({
        conn: { id: "c", accessToken: "tok", expiresAt: null, syncCursor: "prev" },
      });
      watchEvent.findFirst.mockResolvedValue({
        watchedAt: new Date("2026-03-03T00:00:00Z"),
      });
      let calls = 0;
      routeFetch(() => {
        calls += 1;
        return json([], "999999");
      });
      await service.syncHistory("u-1");
      expect(calls).toBe(TRAKT_MAX_PAGES);
      expect(sourceConnection.update.mock.calls[0]![0].data.syncCursor).toBe("prev");
    });

    it("walks ratings and watchlist pages up to the cap", async () => {
      const { service, catalog } = setup();
      const pages: Record<string, string[]> = {};
      routeFetch(
        () => json([]),
        (url) => {
          (pages[url.pathname] ??= []).push(url.searchParams.get("page")!);
          if (url.pathname === "/sync/ratings/movies") {
            return json([{ rating: 5, movie: movie.movie }], "2");
          }
          if (url.pathname === "/sync/watchlist/shows") {
            return json([{ show: episode.show }], "999999");
          }
          return json([]);
        },
      );
      await service.syncHistory("u-1");
      expect(pages["/sync/ratings/movies"]).toEqual(["1", "2"]);
      expect(pages["/sync/ratings/shows"]).toEqual(["1"]);
      expect(pages["/sync/watchlist/shows"]).toHaveLength(TRAKT_MAX_PAGES);
      expect(catalog.upsertListState).toHaveBeenCalledTimes(2 + TRAKT_MAX_PAGES);
    });
  });

  describe("failure handling", () => {
    it("aborts on a history error without advancing the cursor", async () => {
      const { service, sourceConnection } = setup();
      routeFetch(() => new Response("x".repeat(500), { status: 503 }));
      const err = await service.syncHistory("u-1").catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe(
        `Trakt GET /sync/history: 503 ${"x".repeat(200)}`,
      );
      expect(sourceConnection.update).not.toHaveBeenCalled();
      expect(service.isSyncing("u-1")).toBe(false);
    });

    it("aborts on an unparseable history body without advancing the cursor", async () => {
      const { service, sourceConnection } = setup();
      routeFetch(() => new Response("<html>", { status: 200 }));
      await expect(service.syncHistory("u-1")).rejects.toThrow();
      expect(sourceConnection.update).not.toHaveBeenCalled();
    });

    it("aborts on a non-array history body without advancing the cursor", async () => {
      const { service, sourceConnection } = setup();
      routeFetch(() => json({ error: "nope" }));
      await expect(service.syncHistory("u-1")).rejects.toThrow();
      expect(sourceConnection.update).not.toHaveBeenCalled();
    });

    it("keeps going when ratings fail, still syncing watchlist and cursor", async () => {
      const { service, sourceConnection } = setup();
      const paths: string[] = [];
      routeFetch(
        () => json([]),
        (url) => {
          paths.push(url.pathname);
          return url.pathname.startsWith("/sync/ratings")
            ? new Response("down", { status: 500 })
            : json([]);
        },
      );
      await expect(service.syncHistory("u-1")).resolves.toMatchObject({ ok: true });
      expect(paths).toEqual([
        "/sync/ratings/movies",
        "/sync/watchlist/movies",
        "/sync/watchlist/shows",
      ]);
      expect(sourceConnection.update).toHaveBeenCalledTimes(1);
    });

    it("keeps going when the watchlist fails", async () => {
      const { service, sourceConnection } = setup();
      routeFetch(
        () => json([]),
        (url) =>
          url.pathname.startsWith("/sync/watchlist")
            ? new Response("down", { status: 500 })
            : json([]),
      );
      await expect(service.syncHistory("u-1")).resolves.toMatchObject({ ok: true });
      expect(sourceConnection.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("cursor and status", () => {
    it("advances the cursor to the newest trakt event of that user", async () => {
      const { service, sourceConnection, watchEvent } = setup();
      watchEvent.findFirst.mockResolvedValue({
        watchedAt: new Date("2026-03-03T00:00:00Z"),
      });
      routeFetch(() => json([]));
      await service.syncHistory("u-1");

      expect(watchEvent.findFirst).toHaveBeenCalledWith({
        where: { userId: "u-1", source: "trakt" },
        orderBy: { watchedAt: "desc" },
      });
      const arg = sourceConnection.update.mock.calls[0]![0];
      expect(arg.where).toEqual({
        userId_provider: { userId: "u-1", provider: "trakt" },
      });
      expect(arg.data.syncCursor).toBe("2026-03-03T00:00:00.000Z");
      expect(arg.data.lastSyncedAt).toBeInstanceOf(Date);
    });

    it("keeps the previous cursor when the user has no events", async () => {
      const { service, sourceConnection } = setup({
        conn: { id: "c", accessToken: "tok", expiresAt: null, syncCursor: "prev" },
      });
      routeFetch(() => json([]));
      await service.syncHistory("u-1");
      expect(sourceConnection.update.mock.calls[0]![0].data.syncCursor).toBe("prev");
    });

    it("reports syncing while running and clears afterwards", async () => {
      const { service, catalog } = setup();
      const seen: boolean[] = [];
      catalog.upsertTitle.mockImplementation(async () => {
        seen.push(service.isSyncing("u-1"), service.isSyncing("someone-else"));
        return { id: "t-1" };
      });
      routeFetch(() => json([movie]));
      await service.syncHistory("u-1");
      expect(seen).toEqual([true, false]);
      expect(service.isSyncing("u-1")).toBe(false);
    });

    it("operates on the resolved user, not the requested id", async () => {
      const { service, sourceConnection, catalog } = setup({ user: { id: "owner" } });
      routeFetch(() => json([movie]));
      await expect(service.syncHistory("requested")).resolves.toMatchObject({
        userId: "owner",
      });
      for (const [arg] of sourceConnection.findUnique.mock.calls) {
        expect(arg.where.userId_provider.userId).toBe("owner");
      }
      expect(catalog.recordWatch.mock.calls[0]![0].userId).toBe("owner");
    });
  });
});
