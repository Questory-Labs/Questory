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

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function routeManga(body: unknown) {
  providerFetch.mockImplementation(async (_url: string, init: { body: string }) =>
    JSON.parse(init.body).query.includes("type: MANGA")
      ? json(body)
      : json({ data: { Viewer: { id: 777, name: "v" } } }),
  );
}

function withEntries(...entries: unknown[]) {
  routeManga({ data: { MediaListCollection: { lists: [{ entries }] } } });
}

function entry(overrides: Record<string, unknown> = {}, media: Record<string, unknown> = {}) {
  return {
    id: 10,
    status: "CURRENT",
    score: 0,
    progress: 5,
    progressVolumes: 1,
    updatedAt: 1_700_000_000,
    media: {
      id: 100,
      idMal: 200,
      title: { english: "English", romaji: "Romaji", native: "Native" },
      chapters: 20,
      volumes: 4,
      genres: [],
      format: "MANGA",
      status: "RELEASING",
      countryOfOrigin: "KR",
      startDate: { year: 2019 },
      coverImage: { large: "https://img/large", medium: "https://img/medium" },
      ...media,
    },
    ...overrides,
  };
}

function build() {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue({ id: "conn-1", accessToken: "tok-1" }),
    update: vi.fn().mockResolvedValue({}),
  };
  const readCatalog = {
    upsertTitle: vi.fn(async (i: { anilistId: number } & Record<string, unknown>) => ({ id: `r-${i.anilistId}` })),
    linkGenres: vi.fn().mockResolvedValue(undefined),
    upsertListState: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  };
  const service = new AnilistService(
    { sourceConnection } as unknown as PrismaService,
    { upsertTitle: vi.fn() } as unknown as CatalogService,
    { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
    { resolveUser: vi.fn().mockResolvedValue({ id: "u-1" }) } as unknown as UsersService,
    readCatalog as unknown as ReadCatalogService,
    {
      isSourceEnabled: vi.fn().mockResolvedValue(true),
      isDomainEnabled: vi.fn().mockResolvedValue(true),
    } as unknown as FeatureFlagsService,
  );
  return { service, sourceConnection, readCatalog };
}

beforeEach(() => {
  providerFetch.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("AnilistService manga sync", () => {
  it("upserts catalog fields", async () => {
    withEntries(entry());
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertTitle).toHaveBeenCalledWith({
      format: "manga",
      name: "English",
      year: 2019,
      chapters: 20,
      volumes: 4,
      coverUrl: "https://img/large",
      anilistId: 100,
      malId: 200,
      countryOfOrigin: "KR",
      publishingStatus: "RELEASING",
    });
  });

  it("tolerates sparse media", async () => {
    withEntries(
      entry(
        {},
        {
          title: { english: null, romaji: null, native: null },
          idMal: undefined,
          chapters: undefined,
          volumes: undefined,
          format: undefined,
          status: undefined,
          countryOfOrigin: undefined,
          startDate: undefined,
          coverImage: undefined,
        },
      ),
    );
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertTitle).toHaveBeenCalledWith({
      format: "other",
      name: "AniList 100",
      year: null,
      chapters: null,
      volumes: null,
      coverUrl: null,
      anilistId: 100,
      malId: null,
      countryOfOrigin: null,
      publishingStatus: null,
    });
  });

  it("falls back to the medium cover", async () => {
    withEntries(entry({}, { coverImage: { large: null, medium: "https://img/m" } }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertTitle.mock.calls[0][0].coverUrl).toBe("https://img/m");
  });

  it("links genres only when present", async () => {
    withEntries(
      entry({ id: 1 }, { id: 1, genres: ["Drama"] }),
      entry({ id: 2 }, { id: 2, genres: [] }),
    );
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.linkGenres).toHaveBeenCalledTimes(1);
    expect(readCatalog.linkGenres).toHaveBeenCalledWith("r-1", ["Drama"], "anilist");
  });

  it("writes list state for the syncing user", async () => {
    withEntries(entry({ score: 7, progress: 5, progressVolumes: 2 }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertListState).toHaveBeenCalledWith({
      userId: "u-1",
      readTitleId: "r-100",
      listStatus: "reading",
      source: "anilist",
      score: 7,
      progressChapters: 5,
      progressVolumes: 2,
      listedAt: new Date(1_700_000_000_000),
    });
  });

  it("stores an unscored entry with null score and zero volumes", async () => {
    withEntries(entry({ score: 0, progressVolumes: null }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    expect(readCatalog.upsertListState.mock.calls[0][0]).toMatchObject({
      score: null,
      progressVolumes: 0,
    });
    expect(readCatalog.recordProgress.mock.calls[0][0]).toMatchObject({
      rating: null,
      volumesRead: null,
    });
  });

  it("keeps planning entries as list state without a read event", async () => {
    withEntries(entry({ status: "PLANNING", progress: 3 }));
    const { service, readCatalog } = build();
    await expect(service.syncList("u-1", "read")).resolves.toMatchObject({
      mangaAccepted: 1,
    });
    expect(readCatalog.upsertListState.mock.calls[0][0].listStatus).toBe("planning");
    expect(readCatalog.recordProgress).not.toHaveBeenCalled();
  });

  it.each([
    ["COMPLETED", 0, 0, true],
    ["CURRENT", 0, 0, true],
    ["REPEATING", 0, 0, true],
    ["PAUSED", 2, 0, true],
    ["PAUSED", 0, 2, true],
    ["DROPPED", 1, 0, true],
    ["PAUSED", 0, 0, false],
    ["DROPPED", 0, 0, false],
  ])("%s at %i chapters and %i volumes records progress: %s", async (status, progress, progressVolumes, expected) => {
    withEntries(entry({ status, progress, progressVolumes }));
    const { service, readCatalog } = build();
    const result = await service.syncList("u-1", "read");
    expect(readCatalog.recordProgress).toHaveBeenCalledTimes(expected ? 1 : 0);
    expect(readCatalog.upsertListState).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ mangaAccepted: expected ? 1 : 0 });
  });

  it("records progress with a stable dedupe key", async () => {
    withEntries(entry({ id: 42, status: "CURRENT", progress: 5, progressVolumes: 1, score: 9 }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    await service.syncList("u-1", "read");
    const [first, second] = readCatalog.recordProgress.mock.calls.map(([a]) => a);
    expect(first).toMatchObject({
      userId: "u-1",
      readTitleId: "r-100",
      source: "anilist",
      action: "import",
      status: "CURRENT",
      dedupeKey: "anilist:manga:42:CURRENT:5:1",
      chaptersRead: 5,
      volumesRead: 1,
      rating: 9,
      precision: "unknown",
      progress: 25,
    });
    expect(second.dedupeKey).toBe(first.dedupeKey);
  });

  it("uses completedAt with day precision", async () => {
    withEntries(entry({ status: "COMPLETED", completedAt: { year: 2022, month: 2, day: 3 } }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    const arg = readCatalog.recordProgress.mock.calls[0][0];
    expect(arg.readAt.toISOString()).toBe("2022-02-03T12:00:00.000Z");
    expect(arg.precision).toBe("day");
  });

  it.each([
    ["empty lists", { data: { MediaListCollection: { lists: [] } } }],
    ["null collection", { data: { MediaListCollection: null } }],
  ])("treats %s as nothing to import", async (_label, body) => {
    routeManga(body);
    const { service, readCatalog } = build();
    await expect(service.syncList("u-1", "read")).resolves.toMatchObject({
      mangaAccepted: 0,
    });
    expect(readCatalog.upsertTitle).not.toHaveBeenCalled();
  });

  it("propagates catalog failures and clears the syncing flag", async () => {
    withEntries(entry());
    const { service, readCatalog, sourceConnection } = build();
    readCatalog.upsertListState.mockRejectedValue(new Error("db down"));
    await expect(service.syncList("u-1", "read")).rejects.toThrow("db down");
    expect(service.isSyncing("u-1")).toBe(false);
    expect(sourceConnection.update.mock.calls.flatMap(([a]) => Object.keys(a.data))).not.toContain("lastSyncedAt");
  });
});
