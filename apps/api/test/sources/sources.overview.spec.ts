import { SourcesOverviewSchema } from "@questorylabs/shared";
import { describe, expect, it, vi } from "vitest";
import { SourcesService } from "../../src/sources/sources.service";
import {
  SOURCE_DOMAIN_PROVIDERS,
  SOURCES_ERROR_MAX,
  SOURCES_ROW_LIMIT,
} from "../../src/sources/sources.constants";

function setup(
  connections: unknown[] = [],
  keys: unknown[] = [],
  resolvedId = "u-1",
) {
  const connFind = vi.fn().mockResolvedValue(connections);
  const keyFind = vi.fn().mockResolvedValue(keys);
  const resolveUser = vi.fn().mockResolvedValue({ id: resolvedId });
  const service = new SourcesService(
    {
      sourceConnection: { findMany: connFind },
      apiKey: { findMany: keyFind },
    } as never,
    { resolveUser } as never,
  );
  return { service, connFind, keyFind, resolveUser };
}

function conn(provider: string, extra: Record<string, unknown> = {}) {
  return {
    provider,
    lastSyncedAt: null,
    lastError: null,
    externalUserId: null,
    ...extra,
  };
}

function key(type: string, createdAt: string, lastUsedAt: string | null = null) {
  return {
    type,
    createdAt: new Date(createdAt),
    lastUsedAt: lastUsedAt ? new Date(lastUsedAt) : null,
  };
}

async function provider(
  service: SourcesService,
  domain: string,
  name: string,
) {
  const result = await service.overview("u-1");
  return result.domains
    .find((d) => d.domain === domain)!
    .providers.find((p) => p.provider === name)!;
}

describe("SourcesService.overview edge cases", () => {
  describe("queries", () => {
    it("uses the resolved user id, not the raw input", async () => {
      const { service, connFind, keyFind, resolveUser } = setup([], [], "real-id");
      await service.overview("cookie-id");
      expect(resolveUser).toHaveBeenCalledWith("cookie-id");
      expect(connFind.mock.calls[0][0].where.userId).toBe("real-id");
      expect(keyFind.mock.calls[0][0].where.userId).toBe("real-id");
    });

    it("queries each connection provider once and only known ones", async () => {
      const { service, connFind } = setup();
      await service.overview("u-1");
      const providers = connFind.mock.calls[0][0].where.provider.in as string[];
      expect(new Set(providers).size).toBe(providers.length);
      expect([...providers].sort()).toEqual(
        [
          "anilist",
          "bangumi",
          "kitsu",
          "lastfm",
          "letterboxd",
          "mal",
          "shikimori",
          "trakt",
        ].sort(),
      );
    });

    it("excludes public keys and revoked keys", async () => {
      const { service, keyFind } = setup();
      await service.overview("u-1");
      const where = keyFind.mock.calls[0][0].where;
      expect([...where.type.in].sort()).toEqual(["music_ingest", "watch_webhook"]);
      expect(where.revokedAt).toBeNull();
    });

    it("bounds both queries and selects no secrets", async () => {
      const { service, connFind, keyFind } = setup();
      await service.overview("u-1");
      const connArgs = connFind.mock.calls[0][0];
      const keyArgs = keyFind.mock.calls[0][0];
      expect(connArgs.take).toBe(SOURCES_ROW_LIMIT);
      expect(keyArgs.take).toBe(SOURCES_ROW_LIMIT);
      expect(Object.keys(connArgs.select).sort()).toEqual([
        "externalUserId",
        "lastError",
        "lastSyncedAt",
        "provider",
      ]);
      expect(Object.keys(keyArgs.select).sort()).toEqual([
        "createdAt",
        "lastUsedAt",
        "type",
      ]);
    });
  });

  describe("empty state", () => {
    it("lists every provider as disconnected", async () => {
      const { service } = setup();
      const result = await service.overview("u-1");
      expect(result.connected).toBe(0);
      expect(result.domains.map((d) => d.domain)).toEqual(
        Object.keys(SOURCE_DOMAIN_PROVIDERS),
      );
      for (const domain of result.domains) {
        expect(domain.connected).toBe(0);
        for (const p of domain.providers) {
          expect(p).toMatchObject({
            connected: false,
            lastSyncedAt: null,
            lastError: null,
            account: null,
          });
        }
      }
    });

    it("preserves the declared provider order", async () => {
      const { service } = setup();
      const result = await service.overview("u-1");
      for (const domain of result.domains) {
        expect(domain.providers.map((p) => p.provider)).toEqual(
          SOURCE_DOMAIN_PROVIDERS[domain.domain].map((d) => d.provider),
        );
      }
    });
  });

  describe("counts", () => {
    it("counts a two-domain provider per domain but once overall", async () => {
      const { service } = setup([conn("anilist")]);
      const result = await service.overview("u-1");
      const by = Object.fromEntries(
        result.domains.map((d) => [d.domain, d.connected]),
      );
      expect(by).toEqual({ music: 0, watch: 1, read: 1 });
      expect(result.connected).toBe(1);
    });

    it("adds connections and key types together", async () => {
      const { service } = setup(
        [conn("trakt"), conn("mal")],
        [key("music_ingest", "2026-01-01"), key("watch_webhook", "2026-01-01")],
      );
      const result = await service.overview("u-1");
      expect(result.connected).toBe(4);
    });

    it("counts several keys of one type as one source", async () => {
      const { service } = setup([], [
        key("watch_webhook", "2026-02-01"),
        key("watch_webhook", "2026-01-01"),
      ]);
      const result = await service.overview("u-1");
      expect(result.connected).toBe(1);
    });
  });

  describe("api key selection", () => {
    it("reports the most recently used key", async () => {
      const { service } = setup([], [
        key("music_ingest", "2026-03-01", "2026-03-02T00:00:00Z"),
        key("music_ingest", "2026-01-01", "2026-05-01T00:00:00Z"),
      ]);
      const p = await provider(service, "music", "music_ingest");
      expect(p.lastSyncedAt).toBe("2026-05-01T00:00:00.000Z");
    });

    it("treats a newer unused key as more recent than an old used one", async () => {
      const { service } = setup([], [
        key("music_ingest", "2026-06-01"),
        key("music_ingest", "2026-01-01", "2026-02-01T00:00:00Z"),
      ]);
      const p = await provider(service, "music", "music_ingest");
      expect(p.connected).toBe(true);
      expect(p.lastSyncedAt).toBeNull();
    });

    it("shows a never-used key as connected with no sync time", async () => {
      const { service } = setup([], [key("watch_webhook", "2026-01-01")]);
      const p = await provider(service, "watch", "watch_webhook");
      expect(p).toEqual({
        provider: "watch_webhook",
        kind: "api_key",
        connected: true,
        lastSyncedAt: null,
        lastError: null,
        account: null,
      });
    });

    it("does not bleed one key type into the other", async () => {
      const { service } = setup([], [key("music_ingest", "2026-01-01")]);
      const webhook = await provider(service, "watch", "watch_webhook");
      expect(webhook.connected).toBe(false);
    });
  });

  describe("connection fields", () => {
    it("keeps a failing connection connected and surfaces its error", async () => {
      const { service } = setup([conn("trakt", { lastError: "auth_failed" })]);
      const p = await provider(service, "watch", "trakt");
      expect(p).toMatchObject({ connected: true, lastError: "auth_failed" });
    });

    it("keeps an error at the limit and truncates one past it", async () => {
      const exact = "a".repeat(SOURCES_ERROR_MAX);
      const a = setup([conn("trakt", { lastError: exact })]);
      expect((await provider(a.service, "watch", "trakt")).lastError).toBe(exact);
      const b = setup([conn("trakt", { lastError: `${exact}b` })]);
      expect((await provider(b.service, "watch", "trakt")).lastError).toBe(exact);
    });

    it("serializes lastSyncedAt as ISO", async () => {
      const { service } = setup([
        conn("mal", { lastSyncedAt: new Date("2026-04-05T06:07:08Z") }),
      ]);
      const p = await provider(service, "read", "mal");
      expect(p.lastSyncedAt).toBe("2026-04-05T06:07:08.000Z");
    });

    it("exposes the account only for showAccount providers", async () => {
      const { service } = setup([
        conn("lastfm", { externalUserId: "rj" }),
        conn("letterboxd", { externalUserId: "film-fan" }),
        conn("trakt", { externalUserId: "hidden-id" }),
        conn("mal", { externalUserId: "hidden-id" }),
      ]);
      const result = await service.overview("u-1");
      const accounts = Object.fromEntries(
        result.domains
          .flatMap((d) => d.providers)
          .filter((p) => p.connected)
          .map((p) => [p.provider, p.account]),
      );
      expect(accounts).toEqual({
        lastfm: "rj",
        letterboxd: "film-fan",
        trakt: null,
        mal: null,
      });
      expect(JSON.stringify(result)).not.toContain("hidden-id");
    });

    it("returns null account when a showAccount provider has no username", async () => {
      const { service } = setup([conn("lastfm")]);
      const p = await provider(service, "music", "lastfm");
      expect(p.account).toBeNull();
    });
  });

  it("matches the shared response contract", async () => {
    const { service } = setup(
      [
        conn("lastfm", {
          externalUserId: "rj",
          lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
          lastError: "boom",
        }),
      ],
      [key("music_ingest", "2026-01-01", "2026-02-01T00:00:00Z")],
    );
    const result = await service.overview("u-1");
    expect(SourcesOverviewSchema.safeParse(result).success).toBe(true);
    expect(SourcesOverviewSchema.parse(result)).toEqual(result);
  });

  it("propagates a database failure", async () => {
    const { service, connFind } = setup();
    connFind.mockRejectedValue(new Error("db down"));
    await expect(service.overview("u-1")).rejects.toThrow("db down");
  });
});
