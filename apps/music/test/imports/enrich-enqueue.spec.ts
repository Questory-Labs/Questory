import { describe, expect, it } from "vitest";
import {
  assessEnrichmentGaps,
  needsEnrichment,
} from "../../src/enrichment/enrichment-gaps";

/**
 * Mirrors the import-loop enqueue gate: unique track ids, MBID present,
 * catalog still missing enrichment datapoints, and not recently attempted.
 */
function collectEnrichmentTargets(
  listens: Array<{
    trackId: string;
    recordingMbid?: string | null;
    artistMbids?: string[];
    complete?: boolean;
    recentlySynced?: boolean;
  }>,
) {
  const checked = new Set<string>();
  const calls: string[] = [];
  for (const item of listens) {
    const hasMbid =
      Boolean(item.recordingMbid) || Boolean(item.artistMbids?.[0]);
    if (!hasMbid || checked.has(item.trackId)) continue;
    checked.add(item.trackId);
    const incomplete = needsEnrichment(
      assessEnrichmentGaps({
        recordingMbid: item.recordingMbid ?? null,
        artistMbid: item.artistMbids?.[0] ?? null,
        genreCount: item.complete ? 2 : 0,
        metadataSyncedAt: item.recentlySynced ? new Date() : null,
        release: item.complete
          ? { year: 2000, imageUrl: "https://x" }
          : { year: null, imageUrl: null },
      }),
    );
    if (incomplete) calls.push(item.trackId);
  }
  return calls;
}

describe("import enrichment enqueue", () => {
  it("enqueues incomplete unique MBID-bearing tracks once", () => {
    const calls = collectEnrichmentTargets([
      {
        trackId: "t1",
        recordingMbid: "11111111-1111-1111-1111-111111111111",
      },
      {
        trackId: "t1",
        recordingMbid: "11111111-1111-1111-1111-111111111111",
      },
      {
        trackId: "t2",
        artistMbids: ["22222222-2222-2222-2222-222222222222"],
      },
      { trackId: "t3" },
      {
        trackId: "t4",
        recordingMbid: "44444444-4444-4444-4444-444444444444",
        complete: true,
      },
    ]);
    expect(calls).toEqual(["t1", "t2"]);
  });

  it("still enqueues previously added tracks when never enriched", () => {
    const calls = collectEnrichmentTargets([
      {
        trackId: "existing",
        recordingMbid: "11111111-1111-1111-1111-111111111111",
        complete: false,
      },
    ]);
    expect(calls).toEqual(["existing"]);
  });

  it("skips tracks that were already enrichment-attempted recently", () => {
    const calls = collectEnrichmentTargets([
      {
        trackId: "tried",
        recordingMbid: "11111111-1111-1111-1111-111111111111",
        complete: false,
        recentlySynced: true,
      },
    ]);
    expect(calls).toEqual([]);
  });
});
