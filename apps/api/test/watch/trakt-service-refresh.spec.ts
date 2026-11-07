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

  describe("token refresh", () => {
    const expiring = (expiresAt: Date, refreshToken: string | null = "rt") => ({
      id: "c-1",
      accessToken: "old",
      refreshToken,
      expiresAt,
      syncCursor: null,
    });

    function respondWithToken(token: Record<string, unknown>, status = 200) {
      providerFetch.mockImplementation(async (url: URL | string) => {
        if (String(url).endsWith("/oauth/token")) {
          return new Response(JSON.stringify(token), { status });
        }
        return json([]);
      });
    }

    const bearer = () =>
      providerFetch.mock.calls
        .filter(([url]) => new URL(String(url)).pathname === "/sync/history")
        .map(([, init]) => (init.headers as Record<string, string>).Authorization);

    it("refreshes inside the 60s skew window and uses the new token", async () => {
      vi.useFakeTimers({
        now: new Date("2026-01-01T00:00:00Z"),
        toFake: ["Date"],
      });
      const { service, sourceConnection } = setup({
        conn: expiring(new Date("2026-01-01T00:00:30Z")),
      });
      respondWithToken({ access_token: "new", refresh_token: "rt2", expires_in: 7200 });

      await service.syncHistory("u-1");

      const [url, init] = providerFetch.mock.calls[0]!;
      expect(url).toBe("https://api.trakt.tv/oauth/token");
      expect(JSON.parse(init.body as string)).toMatchObject({
        refresh_token: "rt",
        client_id: "cid",
        client_secret: "csecret",
        grant_type: "refresh_token",
      });
      expect(sourceConnection.update.mock.calls[0]![0]).toEqual({
        where: { id: "c-1" },
        data: {
          accessToken: "new",
          refreshToken: "rt2",
          expiresAt: new Date("2026-01-01T02:00:00Z"),
        },
      });
      expect(bearer()).toEqual(["Bearer new"]);
    });

    it("keeps the old refresh token when Trakt does not rotate it", async () => {
      const { service, sourceConnection } = setup({
        conn: expiring(new Date(Date.now() - 1000)),
      });
      respondWithToken({ access_token: "new" });
      await service.syncHistory("u-1");
      expect(sourceConnection.update.mock.calls[0]![0].data).toEqual({
        accessToken: "new",
        refreshToken: "rt",
        expiresAt: null,
      });
    });

    it("keeps the old token when a refresh response has no access token", async () => {
      const { service, sourceConnection } = setup({
        conn: expiring(new Date(Date.now() - 1000)),
      });
      respondWithToken({ refresh_token: "rt2" });
      await service.syncHistory("u-1");
      expect(bearer()).toEqual(["Bearer old"]);
      expect(
        sourceConnection.update.mock.calls.filter(([a]) => a.where.id === "c-1"),
      ).toEqual([]);
    });

    it("bounds the refresh request with a timeout signal", async () => {
      const { service } = setup({
        conn: expiring(new Date(Date.now() - 1000)),
      });
      respondWithToken({ access_token: "new" });
      await service.syncHistory("u-1");
      const [url, init] = providerFetch.mock.calls[0]!;
      expect(String(url)).toMatch(/oauth\/token$/);
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("does not refresh a token with time remaining", async () => {
      const { service } = setup({
        conn: expiring(new Date(Date.now() + 3_600_000)),
      });
      routeFetch(() => json([]));
      await service.syncHistory("u-1");
      expect(bearer()).toEqual(["Bearer old"]);
      expect(
        providerFetch.mock.calls.some(([url]) => String(url).endsWith("/oauth/token")),
      ).toBe(false);
    });

    it("does not refresh without a refresh token", async () => {
      const { service } = setup({
        conn: expiring(new Date(Date.now() - 1000), null),
      });
      routeFetch(() => json([]));
      await service.syncHistory("u-1");
      expect(bearer()).toEqual(["Bearer old"]);
    });

    it("falls back to the old token when the refresh is rejected", async () => {
      const { service } = setup({
        conn: expiring(new Date(Date.now() - 1000)),
      });
      respondWithToken({ error: "invalid_grant" }, 401);
      await service.syncHistory("u-1");
      expect(bearer()).toEqual(["Bearer old"]);
    });

    it("aborts the sync when the refresh request fails in transport", async () => {
      const { service } = setup({
        conn: expiring(new Date(Date.now() - 1000)),
      });
      providerFetch.mockRejectedValue(new Error("timed out"));
      await expect(service.syncHistory("u-1")).rejects.toThrow("timed out");
      expect(service.isSyncing("u-1")).toBe(false);
    });
  });
});
