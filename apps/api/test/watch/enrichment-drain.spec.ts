import { afterEach, describe, expect, it, vi } from "vitest";
import { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";

describe("watch EnrichmentService drain", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enriches each queued title once when several are enqueued together", async () => {
    vi.useFakeTimers();
    const flags = {
      isDomainEnabled: vi.fn(async () => true),
      isSourceEnabled: vi.fn(async () => true),
      onChange: () => () => {},
    };
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { title: { findUnique } };
    const service = new EnrichmentService(
      prisma as unknown as PrismaService,
      {} as CatalogService,
      {} as TmdbService,
      flags as unknown as FeatureFlagsService,
    );

    service.enqueueTitle("title-a");
    service.enqueueTitle("title-b");
    service.enqueueTitle("title-c");
    await vi.runAllTimersAsync();

    expect(findUnique.mock.calls.map((call) => call[0].where.id)).toEqual([
      "title-a",
      "title-b",
      "title-c",
    ]);
    service.onModuleDestroy();
  });
});
