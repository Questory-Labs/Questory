import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminService } from "../../src/admin/admin.service";
import {
  domainHealth,
  readApiVersion,
  serializeLatestSync,
  userModules,
} from "../../src/admin/admin-instance";
import type { PrismaService } from "../../src/prisma/prisma.service";

const empty = () => ({
  accounts: [] as { providerAccountId: string }[],
  libraryEntries: [] as { id: string }[],
  listenHourBuckets: [] as { id: string }[],
  watchHourBuckets: [] as { id: string }[],
  readHourBuckets: [] as { id: string }[],
});

describe("admin-instance helpers", () => {
  it("reads the api package version", () => {
    expect(readApiVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("derives domain health status", () => {
    expect(domainHealth("svc", true, true)).toEqual({
      ok: true,
      service: "svc",
      embedded: true,
      enabled: true,
      status: "up",
    });
    expect(domainHealth("svc", false, true).status).toBe("disabled");
    expect(domainHealth("svc", true, false)).toMatchObject({
      ok: false,
      status: "unavailable",
    });
  });

  it("derives enabled modules from existing rows", () => {
    expect(userModules(empty())).toEqual({
      games: false,
      music: false,
      watch: false,
      read: false,
    });
    expect(
      userModules({
        ...empty(),
        accounts: [{ providerAccountId: "765" }],
        watchHourBuckets: [{ id: "w" }],
      }),
    ).toEqual({ games: true, music: false, watch: true, read: false });
    expect(
      userModules({ ...empty(), libraryEntries: [{ id: "l" }], listenHourBuckets: [{ id: "m" }], readHourBuckets: [{ id: "r" }] }),
    ).toEqual({ games: true, music: true, watch: false, read: true });
  });

  it("serializes the latest sync job", () => {
    expect(serializeLatestSync(undefined)).toBeNull();
    expect(
      serializeLatestSync({
        status: "failed",
        type: "library-sync",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        finishedAt: new Date("2026-01-01T00:05:00.000Z"),
      }),
    ).toEqual({ status: "failed", type: "library-sync", at: "2026-01-01T00:05:00.000Z" });
    expect(
      serializeLatestSync({
        status: "running",
        type: "library-sync",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        finishedAt: null,
      })?.at,
    ).toBe("2026-01-01T00:00:00.000Z");
  });
});

function makeService(
  prisma: unknown,
  overrides: {
    abuse?: unknown;
    flags?: unknown;
    catalog?: unknown;
    schedulerRegistry?: unknown;
    cronRunner?: unknown;
    watchCron?: unknown;
    recap?: unknown;
  } = {},
) {
  return new AdminService(
    prisma as PrismaService,
    (overrides.abuse ?? {}) as never,
    {} as never,
    {} as never,
    (overrides.cronRunner ?? {}) as never,
    (overrides.schedulerRegistry ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.catalog ?? {}) as never,
    (overrides.flags ?? {}) as never,
    (overrides.watchCron ?? null) as never,
    undefined,
    overrides.recap as never,
  );
}

describe("AdminService instance data", () => {
  const abuse = {
    getMetrics: () => ({ rateLimited: 2 }),
    getLimits: () => [{ key: "loginIp", max: 20, windowSeconds: 900 }],
  };

  it("overview includes version, uptime and real domain health", async () => {
    const prisma = {
      user: { count: vi.fn().mockResolvedValue(1) },
      syncJob: { count: vi.fn().mockResolvedValue(0) },
      enrichmentJob: { count: vi.fn().mockResolvedValue(0) },
      titleEnrichmentJob: { count: vi.fn().mockResolvedValue(0) },
      importJob: { count: vi.fn().mockResolvedValue(0) },
      appConfig: { findUnique: vi.fn().mockResolvedValue(null) },
      cronRun: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const flags = {
      isDomainEnabled: vi.fn(async (d: string) => d === "music"),
    };
    const service = makeService(prisma, {
      abuse,
      flags,
      catalog: { getStatus: async () => ({}) },
    });
    const result = await service.overview();
    expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.music).toMatchObject({ ok: true, status: "up" });
    expect(result.watch).toMatchObject({ ok: false, status: "unavailable" });
  });

  it("settings exposes read-only abuse limits", async () => {
    const prisma = {
      user: { count: vi.fn().mockResolvedValue(1) },
      appConfig: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const flags = {
      getAdminFlags: async () => ({ domains: {}, sources: {} }),
    };
    const service = makeService(prisma, { abuse, flags });
    const result = await service.getSettings();
    expect(result.limits).toEqual([{ key: "loginIp", max: 20, windowSeconds: 900 }]);
  });

  it("listUsers reports failing sync count, latest sync and modules", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "u1",
        email: "a@x.io",
        isAdmin: false,
        personaName: "A",
        avatarUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastSyncedAt: null,
        accounts: [{ providerAccountId: "765", displayName: "A" }],
        syncJobs: [
          {
            status: "failed",
            type: "library-sync",
            createdAt: new Date("2026-01-02T00:00:00.000Z"),
            finishedAt: null,
          },
        ],
        libraryEntries: [],
        listenHourBuckets: [{ id: "b" }],
        watchHourBuckets: [],
        readHourBuckets: [],
      },
      {
        id: "u2",
        email: "b@x.io",
        isAdmin: false,
        personaName: null,
        avatarUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastSyncedAt: null,
        accounts: [],
        syncJobs: [],
        libraryEntries: [],
        listenHourBuckets: [],
        watchHourBuckets: [],
        readHourBuckets: [],
      },
    ]);
    const service = makeService({ user: { findMany } });
    const result = await service.listUsers();
    const select = findMany.mock.calls[0][0].select;
    expect(select.syncJobs.take).toBe(1);
    expect(select.listenHourBuckets.take).toBe(1);
    expect(result.failingSyncCount).toBe(1);
    expect(result.users[0]).toMatchObject({
      steamId: "765",
      latestSync: { status: "failed", type: "library-sync" },
      modules: { games: true, music: true, watch: false, read: false },
    });
    expect(result.users[1].latestSync).toBeNull();
  });

  it("cronStatus lists monthly-recap and letterboxd-scrape", async () => {
    const prisma = { cronRun: { findMany: vi.fn().mockResolvedValue([]) } };
    const getCronJob = vi.fn((name: string) => {
      if (name === "monthly-recap" || name === "watch-sync") {
        return { running: false, nextDate: () => null };
      }
      throw new Error("missing");
    });
    const service = makeService(prisma, { schedulerRegistry: { getCronJob } });
    const result = await service.cronStatus();
    const recap = result.jobs.find((j) => j.name === "monthly-recap");
    const letterboxd = result.jobs.find((j) => j.name === "letterboxd-scrape");
    expect(recap).toMatchObject({ registered: true, schedule: expect.any(String) });
    expect(letterboxd).toMatchObject({ registered: true });
    expect(getCronJob).toHaveBeenCalledWith("monthly-recap");
  });

  describe("triggerCron new jobs", () => {
    const cronRunner = {
      run: vi.fn(async (_name: string, _by: string, fn: () => Promise<unknown>) => ({
        runId: "r1",
        result: await fn(),
      })),
    };

    beforeEach(() => {
      cronRunner.run.mockClear();
    });

    it("runs the monthly recap", async () => {
      const recap = { run: vi.fn().mockResolvedValue({ sent: 3 }) };
      const service = makeService({}, { cronRunner, recap });
      await expect(service.triggerCron("monthly-recap", "admin")).resolves.toEqual({
        ok: true,
        runId: "r1",
        result: { sent: 3 },
      });
      expect(recap.run).toHaveBeenCalled();
    });

    it("runs the letterboxd scrape", async () => {
      const watchCron = { runLetterboxdScrape: vi.fn().mockResolvedValue({ ok: true }) };
      const service = makeService({}, { cronRunner, watchCron });
      await service.triggerCron("letterboxd-scrape", "admin");
      expect(watchCron.runLetterboxdScrape).toHaveBeenCalled();
    });

    it("rejects monthly recap when the service is unavailable", async () => {
      const service = makeService({}, { cronRunner });
      await expect(service.triggerCron("monthly-recap", "admin")).rejects.toThrow(
        "Monthly recap unavailable",
      );
    });
  });

  it("enrichment counts include completed in the last 24h", async () => {
    const enrichmentCount = vi.fn(async (args: { where: { completedAt?: unknown } }) =>
      args.where.completedAt ? 7 : 1,
    );
    const zero = vi.fn().mockResolvedValue(0);
    const prisma = {
      enrichmentJob: {
        count: enrichmentCount,
        findMany: vi.fn().mockResolvedValue([]),
      },
      titleEnrichmentJob: { count: zero },
      syncJob: { count: zero },
    };
    const service = makeService(prisma);
    const result = await service.enrichmentOverview({
      domain: "music",
      page: 1,
      pageSize: 15,
      status: "all",
    });
    expect(result.counts.music).toMatchObject({ completed24h: 7, total: 4 });
    expect(result.counts.watch.completed24h).toBe(0);
  });
});
