import { vi, type Mock } from "vitest";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { ReadCatalogService } from "../../src/read/catalog/catalog.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

export type ListProviderDeps = [
  PrismaService,
  CatalogService,
  EnrichmentService,
  UsersService,
  ReadCatalogService,
  FeatureFlagsService,
];

export type ListProviderClass<S> = new (...deps: ListProviderDeps) => S;

export function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function textRes(body: string, status: number): Response {
  return new Response(body, { status });
}

export function makeConn(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    userId: "u-1",
    accessToken: "stored-token",
    refreshToken: "stored-refresh",
    expiresAt: null,
    lastSyncedAt: null,
    externalUserId: null,
    ...overrides,
  };
}

export function createListProviderHarness<S>(Service: ListProviderClass<S>) {
  const sourceConnection = {
    findUnique: vi.fn().mockResolvedValue(makeConn()),
    upsert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const catalog = {
    upsertTitle: vi.fn().mockResolvedValue({ id: "title-1" }),
    recordWatch: vi.fn().mockResolvedValue({}),
    upsertListState: vi.fn().mockResolvedValue({}),
    syncDroppedListState: vi.fn().mockResolvedValue({}),
  };
  const enrichment = { enqueueTitle: vi.fn() };
  const users = {
    resolveUser: vi.fn(async (id?: string) => (id ? { id } : null)),
  };
  const readCatalog = {
    upsertTitle: vi.fn().mockResolvedValue({ id: "read-1" }),
    upsertListState: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  };
  const flags = {
    isSourceEnabled: vi.fn().mockResolvedValue(true),
    isDomainEnabled: vi.fn().mockResolvedValue(true),
  };
  const service = new Service(
    { sourceConnection } as unknown as PrismaService,
    catalog as unknown as CatalogService,
    enrichment as unknown as EnrichmentService,
    users as unknown as UsersService,
    readCatalog as unknown as ReadCatalogService,
    flags as unknown as FeatureFlagsService,
  );
  return {
    service,
    sourceConnection,
    catalog,
    enrichment,
    users,
    readCatalog,
    flags,
  };
}

export type FetchCall = { url: string; init: RequestInit };

export function fetchCalls(fetchMock: Mock): FetchCall[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    init: (init ?? {}) as RequestInit,
  }));
}

export function callHeaders(call: FetchCall): Record<string, string> {
  return call.init.headers as Record<string, string>;
}

export function formBody(call: FetchCall): Record<string, string> {
  return Object.fromEntries(call.init.body as URLSearchParams);
}
