import { describe, expect, it } from "vitest";
import {
  assessEnrichmentGaps,
  hasEnrichmentGaps,
  needsEnrichment,
} from "../../src/enrichment/enrichment-gaps";

describe("enrichment gaps", () => {
  it("detects missing tags/year/cover", () => {
    expect(
      hasEnrichmentGaps(
        assessEnrichmentGaps({
          recordingMbid: "rec",
          artistMbid: null,
          genreCount: 0,
          release: { year: null, imageUrl: null },
        }),
      ),
    ).toBe(true);

    expect(
      hasEnrichmentGaps(
        assessEnrichmentGaps({
          recordingMbid: "rec",
          artistMbid: null,
          genreCount: 2,
          release: { year: 1999, imageUrl: "https://x" },
        }),
      ),
    ).toBe(false);
  });

  it("needs enrichment only when gaps remain and not recently attempted", () => {
    expect(
      needsEnrichment(
        assessEnrichmentGaps({
          recordingMbid: "rec",
          artistMbid: null,
          genreCount: 0,
          metadataSyncedAt: null,
          release: { year: null, imageUrl: null },
        }),
      ),
    ).toBe(true);

    // Previously added track, never enriched — still enqueue.
    expect(
      needsEnrichment(
        assessEnrichmentGaps({
          recordingMbid: "rec",
          artistMbid: null,
          genreCount: 0,
          metadataSyncedAt: null,
          release: { year: null, imageUrl: "https://x" },
        }),
      ),
    ).toBe(true);

    // Already attempted recently; MB may have returned nothing.
    expect(
      needsEnrichment(
        assessEnrichmentGaps({
          recordingMbid: "rec",
          artistMbid: null,
          genreCount: 0,
          metadataSyncedAt: new Date(),
          release: { year: null, imageUrl: null },
        }),
      ),
    ).toBe(false);
  });

  it("skips when there is no MBID", () => {
    expect(
      needsEnrichment(
        assessEnrichmentGaps({
          recordingMbid: null,
          artistMbid: null,
          genreCount: 0,
          release: { year: null, imageUrl: null },
        }),
      ),
    ).toBe(false);
  });
});
