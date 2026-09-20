import { afterEach, describe, expect, it, vi } from "vitest";
import { EnrichmentService } from "../../src/music/enrichment/enrichment.service";
import type { CatalogService } from "../../src/music/catalog/catalog.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("music EnrichmentService drain", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resumes queued tracks after Music is re-enabled", async () => {
    const state = { music: false, musicbrainz: true };
    const listeners = new Set<() => void>();
    const flags = {
      isDomainEnabled: vi.fn(async () => state.music),
      isSourceEnabled: vi.fn(async () => state.musicbrainz),
      onChange: (fn: () => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
    const prisma = {
      enrichmentJob: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "job-1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      track: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new EnrichmentService(
      prisma as unknown as PrismaService,
      {} as CatalogService,
      flags as unknown as FeatureFlagsService,
    );

    await service.enqueueTrack("t1");
    await vi.waitFor(() => {
      expect(flags.isDomainEnabled).toHaveBeenCalled();
    });
    expect(prisma.track.findUnique).not.toHaveBeenCalled();

    state.music = true;
    for (const fn of listeners) fn();
    await vi.waitFor(() => {
      expect(prisma.track.findUnique).toHaveBeenCalled();
    });

    service.onModuleDestroy();
  });
});
