import type { MusicPlayingNow } from "@questorylabs/shared";
import {
  LASTFM_PROVIDER,
  LASTFM_SUBMISSION_CLIENT,
} from "../scrobbler/scrobbler.constants";

/** Cached analytics DTO for now-playing (non-null shape). */
export type PlayingNowSnapshot = NonNullable<MusicPlayingNow>;

export const PLAYING_NOW_CACHE_TTL_SECONDS = 90;
/** Must match cache TTL — Prisma must not outlive Redis as a zombie now-playing. */
export const PLAYING_NOW_STALE_MS = PLAYING_NOW_CACHE_TTL_SECONDS * 1000;

export function playingNowCacheKey(userId: string) {
  return `music:playing-now:${userId}`;
}

const toIso = (value: Date | string | null | undefined) =>
  value == null ? null : typeof value === "string" ? value : value.toISOString();

export function toPlayingNowSnapshot(input: {
  updatedAt: Date | string;
  startedAt?: Date | string | null;
  source?: string | null;
  track: {
    id: string;
    title: string;
    artistId: string;
    artistName: string;
    releaseId: string | null;
    releaseTitle: string | null;
    imageUrl: string | null;
    year?: number | null;
    durationMs?: number | null;
  };
}): PlayingNowSnapshot {
  return {
    updatedAt: toIso(input.updatedAt)!,
    startedAt: toIso(input.startedAt),
    source: input.source ?? null,
    track: {
      id: input.track.id,
      title: input.track.title,
      artistId: input.track.artistId,
      artistName: input.track.artistName,
      releaseId: input.track.releaseId,
      releaseTitle: input.track.releaseTitle,
      imageUrl: input.track.imageUrl,
      year: input.track.year ?? null,
      durationMs: input.track.durationMs ?? null,
    },
  };
}

export function playingNowSource(meta: {
  submissionClient?: string | null;
  musicService?: string | null;
}): string | null {
  if (meta.submissionClient === LASTFM_SUBMISSION_CLIENT) return LASTFM_PROVIDER;
  return meta.submissionClient?.trim() || meta.musicService?.trim() || null;
}

export function resolvePlayingNowStartedAt(
  existing: { trackId: string; startedAt: Date | null } | null,
  trackId: string,
  now: Date,
): Date {
  if (existing && existing.trackId === trackId && existing.startedAt) {
    return existing.startedAt;
  }
  return now;
}
