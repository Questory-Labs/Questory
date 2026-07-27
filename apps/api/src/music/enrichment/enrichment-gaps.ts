export const ENRICHMENT_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export type EnrichmentGapInput = {
  recordingMbid: string | null;
  artistMbid: string | null;
  genreCount: number;
  metadataSyncedAt?: Date | null;
  release: {
    year: number | null;
    imageUrl: string | null;
  } | null;
  nowMs?: number;
};

export type EnrichmentGaps = {
  /** Can usefully call MusicBrainz / Cover Art Archive. */
  hasMbid: boolean;
  missingTags: boolean;
  missingYear: boolean;
  missingCover: boolean;
  /** True when metadataSyncedAt is within the courtesy window. */
  recentlyAttempted: boolean;
};

export function assessEnrichmentGaps(input: EnrichmentGapInput): EnrichmentGaps {
  const hasMbid = Boolean(input.recordingMbid || input.artistMbid);
  const missingTags = input.genreCount === 0;
  const missingYear = Boolean(input.release && input.release.year == null);
  const missingCover = Boolean(input.release && !input.release.imageUrl);
  const now = input.nowMs ?? Date.now();
  const recentlyAttempted = Boolean(
    input.metadataSyncedAt &&
      now - input.metadataSyncedAt.getTime() < ENRICHMENT_FRESH_MS,
  );
  return {
    hasMbid,
    missingTags,
    missingYear,
    missingCover,
    recentlyAttempted,
  };
}

/** Missing genre/year/cover and we can call MusicBrainz. */
export function hasEnrichmentGaps(gaps: EnrichmentGaps): boolean {
  if (!gaps.hasMbid) return false;
  return gaps.missingTags || gaps.missingYear || gaps.missingCover;
}

/**
 * Import / queue gate: enrich when gaps remain and we have not already
 * attempted within the fresh window (MB may legitimately have no tags).
 */
export function needsEnrichment(gaps: EnrichmentGaps): boolean {
  if (!hasEnrichmentGaps(gaps)) return false;
  if (gaps.recentlyAttempted) return false;
  return true;
}
