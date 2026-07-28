import type { MusicPlayingNow } from "@questorylabs/shared";

/** Cached analytics DTO for now-playing (non-null shape). */
export type PlayingNowSnapshot = NonNullable<MusicPlayingNow>;

export const PLAYING_NOW_CACHE_TTL_SECONDS = 180;
export const PLAYING_NOW_STALE_MS = 15 * 60 * 1000;

export function playingNowCacheKey(userId: string) {
  return `music:playing-now:${userId}`;
}

export function toPlayingNowSnapshot(input: {
  updatedAt: Date | string;
  track: {
    id: string;
    title: string;
    artistId: string;
    artistName: string;
    releaseId: string | null;
    releaseTitle: string | null;
    imageUrl: string | null;
  };
}): PlayingNowSnapshot {
  const updatedAt =
    typeof input.updatedAt === "string"
      ? input.updatedAt
      : input.updatedAt.toISOString();
  return {
    updatedAt,
    track: {
      id: input.track.id,
      title: input.track.title,
      artistId: input.track.artistId,
      artistName: input.track.artistName,
      releaseId: input.track.releaseId,
      releaseTitle: input.track.releaseTitle,
      imageUrl: input.track.imageUrl,
    },
  };
}
