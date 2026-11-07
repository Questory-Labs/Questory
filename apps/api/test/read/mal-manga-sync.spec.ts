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

function pages(...queue: unknown[]) {
  providerFetch.mockImplementation(
    async () => new Response(JSON.stringify(queue.shift() ?? { data: [] }), { status: 200 }),
  );
}

function entry(listStatus: Record<string, unknown> = {}, node: Record<string, unknown> = {}) {
  return {
    node: {
      id: 100,
      title: "Manga",
      main_picture: { large: "https://img/l" },
      start_date: "2018-02-03",
      num_chapters: 40,
      num_volumes: 5,
      ...node,
    },
    list_status: {
      status: "reading",
      score: 0,
      num_chapters_read: 10,
      num_volumes_read: 1,
      updated_at: "2023-01-02T03:04:05+00:00",
      ...listStatus,
    },
  };
}

function build() {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue({
      id: "conn-1",
      accessToken: "tok-1",
      refreshToken: null,
      expiresAt: null,
    }),
    update: vi.fn().mockResolvedValue({}),
  };
  const readCatalog = {
    upsertTitle: vi.fn(async (i: { malId: number }) => ({ id: `r-${i.malId}` })),
    upsertListState: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  };
  const catalog = { upsertTitle: vi.fn() };
  const service = new MalService(
    { sourceConnection } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
    { resolveUser: vi.fn().mockResolvedValue({ id: "u-1" }) } as unknown as UsersService,
    readCatalog as unknown as ReadCatalogService,
    {
      isSourceEnabled: vi.fn().mockResolvedValue(true),
      isDomainEnabled: vi.fn().mockResolvedValue(true),
    } as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, readCatalog, catalog };
}

beforeEach(() => {
  providerFetch.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("MalService manga sync", () => {
  it("requests the authenticated user's manga list", async () => {
    pages();
    await build().service.syncList("u-1", "read");
    expect(providerFetch).toHaveBeenCalledTimes(1);
    const [url, init] = providerFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/v2/users/@me/mangalist");
    expect(parsed.searchParams.get("fields")).toContain("num_chapters_read");
    expect(init.headers).toEqual({ Authorization: "Bearer tok-1" });
  });

  it("runs both lists under the both scope and reports each count", async () => {
    providerFetch.mockImplementation(async (url: string) =>
      new Response(
        JSON.stringify(url.includes("mangalist") ? { data: [entry()] } : { data: [] }),
        { status: 200 },
      ),
    );
    const { service } = build();
    await expect(service.syncList("u-1")).resolves.toEqual({
      ok: true,
      accepted: 0,
      mangaAccepted: 1,
      userId: "u-1",
    });
    expect(providerFetch).toHaveBeenCalledTimes(2);
  });

  it("does not touch the watch catalog under read scope", async () => {
    pages({ data: [entry()] });
    const { service, catalog } = build();
    await service.syncList("u-1", "read");
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
  });

  it("paginates by 100", async () => {
    pages(
      { data: [entry({}, { id: 1 })], paging: { next: "x" } },
      { data: [entry({}, { id: 2 })] },
    );
    const { service, readCatalog } = build();
    await expect(service.syncList("u-1", "read")).resolves.toMatchObject({
      mangaAccepted: 2,
    });
    expect(
      providerFetch.mock.calls.map(([u]) => new URL(u).searchParams.get("offset")),
    ).toEqual(["0", "100"]);
    expect(readCatalog.upsertTitle).toHaveBeenCalledTimes(2);
  });

  it("stops on an empty page", async () => {
    pages({ data: [], paging: { next: "x" } });
    await build().service.syncList("u-1", "read");
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("upserts catalog fields", async () => {
    pages({ data: [entry()] });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertTitle).toHaveBeenCalledWith({
      format: "manga",
      name: "Manga",
      year: 2018,
      chapters: 40,
      volumes: 5,
      coverUrl: "https://img/l",
      malId: 100,
    });
  });

  it("tolerates sparse nodes", async () => {
    pages({
      data: [
        entry(
          {},
          {
            main_picture: undefined,
            start_date: "bad",
            num_chapters: undefined,
            num_volumes: undefined,
          },
        ),
      ],
    });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertTitle.mock.calls[0][0]).toMatchObject({
      year: null,
      chapters: null,
      volumes: null,
      coverUrl: null,
    });
  });

  it.each([
    ["reading", "reading"],
    ["completed", "completed"],
    ["on_hold", "paused"],
    ["dropped", "dropped"],
    ["plan_to_read", "planning"],
  ])("maps list status %s to %s", async (status, listStatus) => {
    pages({ data: [entry({ status })] });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertListState.mock.calls[0][0].listStatus).toBe(listStatus);
  });

  it("writes list state for the syncing user", async () => {
    pages({ data: [entry({ score: 8, num_chapters_read: 11, num_volumes_read: 2 })] });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertListState).toHaveBeenCalledWith({
      userId: "u-1",
      readTitleId: "r-100",
      listStatus: "reading",
      source: "mal",
      score: 8,
      progressChapters: 11,
      progressVolumes: 2,
      listedAt: new Date("2023-01-02T03:04:05+00:00"),
    });
  });

  it("keeps plan_to_read as list state without a read event", async () => {
    pages({ data: [entry({ status: "plan_to_read", num_chapters_read: 3 })] });
    const { service, readCatalog } = build();
    await expect(service.syncList("u-1", "read")).resolves.toMatchObject({
      mangaAccepted: 1,
    });
    expect(readCatalog.recordProgress).not.toHaveBeenCalled();
  });

  it("treats a missing list_status as plan_to_read", async () => {
    pages({ data: [{ node: entry().node }] });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertListState.mock.calls[0][0]).toMatchObject({
      listStatus: "planning",
      score: null,
      progressChapters: 0,
      progressVolumes: 0,
    });
    expect(readCatalog.recordProgress).not.toHaveBeenCalled();
  });

  it.each([
    ["completed", 0, 0, true],
    ["reading", 0, 0, true],
    ["on_hold", 2, 0, true],
    ["on_hold", 0, 2, true],
    ["dropped", 1, 0, true],
    ["on_hold", 0, 0, false],
    ["dropped", 0, 0, false],
  ])("%s at %i chapters and %i volumes records progress: %s", async (status, ch, vol, expected) => {
    pages({ data: [entry({ status, num_chapters_read: ch, num_volumes_read: vol })] });
    const { service, readCatalog } = build();
    const result = await service.syncList("u-1", "read");
    expect(readCatalog.recordProgress).toHaveBeenCalledTimes(expected ? 1 : 0);
    expect(result).toMatchObject({ mangaAccepted: expected ? 1 : 0 });
  });

  it("records progress with a stable dedupe key", async () => {
    const page = { data: [entry({ score: 9, num_chapters_read: 10, num_volumes_read: 1 })] };
    pages(page, page);
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    await service.syncList("u-1", "read");
    const [first, second] = readCatalog.recordProgress.mock.calls.map(([a]) => a);
    expect(first).toMatchObject({
      userId: "u-1",
      readTitleId: "r-100",
      source: "mal",
      action: "import",
      status: "reading",
      dedupeKey: "mal:manga:100:reading:10:1",
      chaptersRead: 10,
      volumesRead: 1,
      progress: 25,
      rating: 9,
      precision: "unknown",
    });
    expect(second.dedupeKey).toBe(first.dedupeKey);
  });

  it("nulls zero counters on the read event and reports completed as 100%", async () => {
    pages({
      data: [
        entry({
          status: "completed",
          num_chapters_read: 0,
          num_volumes_read: 0,
          finish_date: "2022-05-06",
        }),
      ],
    });
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    const arg = readCatalog.recordProgress.mock.calls[0][0];
    expect(arg).toMatchObject({
      chaptersRead: null,
      volumesRead: null,
      rating: null,
      progress: 100,
      precision: "day",
    });
    expect(arg.readAt).toEqual(new Date("2022-05-06"));
  });

  it("does not mark synced when the list request fails", async () => {
    providerFetch.mockResolvedValue(new Response("nope", { status: 503 }));
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1", "read")).rejects.toThrow(": 503 ");
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
    expect(service.isSyncing("u-1")).toBe(false);
  });
});
