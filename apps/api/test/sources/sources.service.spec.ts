import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { SourcesService } from "../../src/sources/sources.service";
import { ReadSyncStatusController } from "../../src/read/sync-status.controller";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { AnilistService } from "../../src/watch/anilist/anilist.service";
import type { MalService } from "../../src/watch/mal/mal.service";
import type { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import type { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import type { ShikimoriService } from "../../src/watch/shikimori/shikimori.service";

function makeService(
  connections: unknown[],
  keys: unknown[],
  user: { id: string } | null = { id: "u-1" },
) {
  const connFind = vi.fn().mockResolvedValue(connections);
  const keyFind = vi.fn().mockResolvedValue(keys);
  const service = new SourcesService(
    {
      sourceConnection: { findMany: connFind },
      apiKey: { findMany: keyFind },
    } as unknown as PrismaService,
    { resolveUser: vi.fn().mockResolvedValue(user) } as unknown as UsersService,
  );
  return { service, connFind, keyFind };
}

describe("SourcesService.overview", () => {
  it("aggregates connections and api keys per domain without secrets", async () => {
    const { service, connFind, keyFind } = makeService(
      [
        {
          provider: "anilist",
          lastSyncedAt: new Date("2026-10-26T00:00:00Z"),
          lastError: null,
          externalUserId: "123",
        },
        {
          provider: "lastfm",
          lastSyncedAt: null,
          lastError: "x".repeat(500),
          externalUserId: "rj",
        },
      ],
      [
        {
          type: "watch_webhook",
          lastUsedAt: new Date("2026-10-20T00:00:00Z"),
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
    );

    const result = await service.overview("u-1");

    expect(result.connected).toBe(3);
    const music = result.domains.find((d) => d.domain === "music")!;
    const watch = result.domains.find((d) => d.domain === "watch")!;
    const read = result.domains.find((d) => d.domain === "read")!;
    expect(music.connected).toBe(1);
    expect(music.providers[0]).toMatchObject({
      provider: "lastfm",
      connected: true,
      account: "rj",
    });
    expect(music.providers[0].lastError).toHaveLength(200);
    expect(watch.connected).toBe(2);
    expect(watch.providers.find((p) => p.provider === "anilist")?.account).toBeNull();
    expect(
      watch.providers.find((p) => p.provider === "watch_webhook"),
    ).toMatchObject({ connected: true, lastSyncedAt: "2026-10-20T00:00:00.000Z" });
    expect(read.connected).toBe(1);

    const connArgs = connFind.mock.calls[0][0];
    expect(connArgs.where.userId).toBe("u-1");
    expect(connArgs.select).not.toHaveProperty("accessToken");
    expect(connArgs.take).toBeGreaterThan(0);
    expect(keyFind.mock.calls[0][0].where).toMatchObject({
      userId: "u-1",
      revokedAt: null,
    });
  });

  it("404s without a user", async () => {
    const { service } = makeService([], [], null);
    await expect(service.overview("x")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ReadSyncStatusController", () => {
  it("reports every list provider", async () => {
    const conn = (lastSyncedAt: string | null, syncing = false) => ({
      getConnection: vi.fn().mockResolvedValue({
        connected: lastSyncedAt != null,
        syncing,
        lastSyncedAt,
      }),
    });
    const ctrl = new ReadSyncStatusController(
      conn("2026-10-01T00:00:00.000Z") as unknown as AnilistService,
      conn("2026-10-02T00:00:00.000Z", true) as unknown as MalService,
      conn(null) as unknown as KitsuService,
      conn(null) as unknown as BangumiService,
      { getConnection: vi.fn().mockResolvedValue(null) } as unknown as ShikimoriService,
    );

    const result = await ctrl.syncStatus("u-1");

    expect(result.active).toBe(true);
    expect(result.anilist.lastSyncedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(result.mal).toEqual({
      connected: true,
      syncing: true,
      lastSyncedAt: "2026-10-02T00:00:00.000Z",
    });
    expect(result.shikimori).toEqual({
      connected: false,
      syncing: false,
      lastSyncedAt: null,
    });
  });
});
