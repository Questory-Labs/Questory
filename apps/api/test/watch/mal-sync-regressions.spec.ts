import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
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

function animeEntry(node: Record<string, unknown> = {}) {
  return {
    node: { id: 100, title: "Title", num_episodes: 1, ...node },
    list_status: { status: "completed", num_episodes_watched: 1 },
  };
}

function mangaEntry(chapters = 7) {
  return {
    node: { id: 200, title: "Manga", num_chapters: 20 },
    list_status: { status: "reading", num_chapters_read: chapters },
  };
}

function build(conn: unknown = CONN) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(conn),
    update: vi.fn().mockResolvedValue({}),
  };
  const catalog = {
    upsertTitle: vi.fn(async (i: { malId: number; type?: string }) => ({ id: `t-${i.malId}` })),
    recordWatch: vi.fn().mockResolvedValue({}),
    upsertListState: vi.fn().mockResolvedValue({}),
    syncDroppedListState: vi.fn().mockResolvedValue(undefined),
  };
  const readCatalog = {
    upsertTitle: vi.fn(async (i: { malId: number }) => ({ id: `r-${i.malId}` })),
    upsertListState: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  };
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
  return { service, sourceConnection, catalog, readCatalog };
}

function writes(sourceConnection: { update: ReturnType<typeof vi.fn> }) {
  return sourceConnection.update.mock.calls.map(([a]) => a.data as Record<string, unknown>);
}

function refreshThen(tokenResponse: () => Response) {
  providerFetch.mockImplementation(async (url: string) =>
    url === TOKEN_URL ? tokenResponse() : json({ data: [] }),
  );
}

function bearerUsed() {
  const call = providerFetch.mock.calls.find(([u]) => u !== TOKEN_URL);
  return call?.[1].headers.Authorization;
}

beforeEach(() => {
  providerFetch.mockReset();
  vi.stubEnv("MAL_CLIENT_ID", "mal-id");
  vi.stubEnv("MAL_CLIENT_SECRET", "mal-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MAL title type", () => {
  it.each([
    ["movie", true],
    ["tv", undefined],
  ])("marks media_type %s as provider typed: %s", async (mediaType, expected) => {
    providerFetch.mockResolvedValueOnce(json({ data: [animeEntry({ media_type: mediaType })] }));
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(
      (catalog.upsertTitle.mock.calls[0][0] as { typeFromProvider?: boolean }).typeFromProvider,
    ).toBe(expected);
  });

  it("requests media_type", async () => {
    providerFetch.mockImplementation(async () => json({ data: [] }));
    await build().service.syncList("u-1", "watch");
    const url = new URL(providerFetch.mock.calls[0][0]);
    expect(url.searchParams.get("fields")).toContain("media_type");
  });

  it.each([
    ["movie", "movie"],
    ["tv", "show"],
    ["ova", "show"],
    ["special", "show"],
    ["ona", "show"],
    [undefined, "show"],
  ])("maps media_type %s to %s", async (mediaType, expected) => {
    providerFetch.mockResolvedValueOnce(json({ data: [animeEntry({ media_type: mediaType })] }));
    const { service, catalog } = build();
    await service.syncList("u-1", "watch");
    expect(catalog.upsertTitle.mock.calls[0][0].type).toBe(expected);
  });
});

describe("MAL pagination limit", () => {
  it.each([
    ["anime", "watch", () => animeEntry()],
    ["manga", "read", () => mangaEntry()],
  ] as const)("stops %s paging and records the failure", async (_label, scope, makeEntry) => {
    providerFetch.mockImplementation(async () =>
      json({ data: [makeEntry()], paging: { next: "again" } }),
    );
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1", scope)).rejects.toThrow(
      "MAL list pagination limit reached",
    );
    expect(providerFetch).toHaveBeenCalledTimes(500);
    expect(writes(sourceConnection)).toEqual([
      { lastError: "MAL list pagination limit reached" },
    ]);
    expect(service.isSyncing("u-1")).toBe(false);
  });
});

describe("MAL manga progress", () => {
  it("hands the absolute progress to the catalog as a total", async () => {
    providerFetch.mockResolvedValueOnce(json({ data: [mangaEntry(7)] }));
    const { service, readCatalog } = build();
    await service.syncList("u-1", "read");
    const arg = readCatalog.recordProgress.mock.calls[0][0];
    expect(arg.chaptersTotal).toBe(7);
    expect(arg).not.toHaveProperty("chaptersDelta");
  });
});

describe("MAL token refresh responses", () => {
  it.each([
    ["an empty object", () => new Response("{}", { status: 200 })],
    ["a null token", () => new Response('{"access_token":null}', { status: 200 })],
    ["non-JSON", () => new Response("<html>", { status: 200 })],
  ])("keeps the stored token on %s", async (_label, response) => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    refreshThen(response);
    const { service, sourceConnection } = build({ ...CONN, expiresAt: new Date(0) });
    await service.syncList("u-1", "watch");
    expect(warn).toHaveBeenCalledWith("MAL refresh failed: missing access_token");
    expect(bearerUsed()).toBe("Bearer tok-1");
    expect(writes(sourceConnection).some((d) => "accessToken" in d)).toBe(false);
  });
});

describe("MAL lastError", () => {
  it("clears a previous error on success", async () => {
    providerFetch.mockImplementation(async () => json({ data: [] }));
    const { service, sourceConnection } = build();
    await service.syncList("u-1", "watch");
    expect(sourceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { lastSyncedAt: expect.any(Date), lastError: null },
    });
  });

  it("records a failed request without advancing lastSyncedAt", async () => {
    providerFetch.mockResolvedValue(new Response("nope", { status: 401 }));
    const { service, sourceConnection } = build();
    await expect(service.syncList("u-1", "watch")).rejects.toThrow(": 401 ");
    expect(sourceConnection.update).toHaveBeenCalledOnce();
    const [arg] = sourceConnection.update.mock.calls[0];
    expect(arg.where).toEqual({ id: "conn-1" });
    expect(Object.keys(arg.data)).toEqual(["lastError"]);
    expect(arg.data.lastError).toContain(": 401 nope");
  });

  it("caps the stored message", async () => {
    providerFetch.mockResolvedValueOnce(json({ data: [animeEntry()] }));
    const { service, sourceConnection, catalog } = build();
    catalog.upsertTitle.mockRejectedValue(new Error("z".repeat(1000)));
    await service.syncList("u-1", "watch").catch(() => undefined);
    expect(String(writes(sourceConnection)[0].lastError)).toHaveLength(300);
  });

  it("does not store database error text", async () => {
    providerFetch.mockResolvedValueOnce(json({ data: [animeEntry()] }));
    const { service, sourceConnection, catalog } = build();
    const dbError = Object.assign(new Error("Invalid invocation accessToken: tok-1"), {
      name: "PrismaClientKnownRequestError",
    });
    catalog.upsertTitle.mockRejectedValue(dbError);
    await expect(service.syncList("u-1", "watch")).rejects.toBe(dbError);
    expect(writes(sourceConnection)).toEqual([{ lastError: "Sync failed" }]);
  });

  it("keeps the original error when writing lastError fails", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    providerFetch.mockResolvedValue(new Response("nope", { status: 500 }));
    const { service, sourceConnection } = build();
    sourceConnection.update.mockRejectedValue(new Error("db down"));
    await expect(service.syncList("u-1", "watch")).rejects.toThrow(": 500 ");
    expect(warn).toHaveBeenCalledWith("MAL lastError write failed: db down");
    expect(service.isSyncing("u-1")).toBe(false);
  });
});
