export const MUSIC_SCROBBLER_PROVIDERS = ["lastfm", "spotify"] as const;

export type MusicScrobblerProviderId =
  (typeof MUSIC_SCROBBLER_PROVIDERS)[number];

export const LASTFM_PROVIDER = "lastfm" as const;

/** Stored on SourceConnection.lastError when the provider session is dead. */
export const SCROBBLER_AUTH_FAILED = "auth_failed";

export const LB_NATIVE_DISABLED_ERROR =
  "ListenBrainz ingest is disabled because Questory native scrobbling is enabled for this user";

export const SCROBBLER_TICK_MS = 5_000;
export const SCROBBLER_CONNECTION_CACHE_MS = 30_000;
export const SCROBBLER_CONNECTION_CACHE_TTL_SECONDS = 30;
export const SCROBBLER_NATIVE_CACHE_TTL_SECONDS = 30;
export const SCROBBLER_AUTH_TOKEN_TTL_SECONDS = 900;

/** Last.fm shared-key ceiling is ~5 req/s — stay under it in the worker. */
export const LASTFM_MAX_RPS = 5;
export const LASTFM_QUEUE_CONCURRENCY = 4;
export const SCROBBLER_QUEUE_NAME = "music-scrobble";

export const LASTFM_POLL_INTERVAL_MS = 30_000;
export const LASTFM_CATCHUP_MAX_TRACKS = 200;
export const LASTFM_CATCHUP_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
export const LASTFM_RECENT_LIMIT = 50;

export function nativeCacheKey(userId: string): string {
  return `scrobbler:native:${userId}`;
}

export function lastFmAuthCacheKey(token: string): string {
  return `scrobbler:lastfm:auth:${token}`;
}

export function scrobblerLockKey(provider: string, userId: string): string {
  return `scrobbler:${provider}:${userId}`;
}

export function scrobblerJobId(provider: string, userId: string): string {
  return `poll:${provider}:${userId}`;
}

export function isScrobblerWorkerProcess(): boolean {
  return (process.env.PROCESS_ROLE || "").trim().toLowerCase() === "scrobbler";
}

/**
 * Stretch the poll interval so N users at `rps` do not backlog.
 * 1000 users / 5 Last.fm req/s → ~200s between polls per user.
 */
export function scaledPollIntervalMs(
  userCount: number,
  baseIntervalMs: number,
  concurrency: number,
): number {
  const drainMs = Math.ceil(
    (Math.max(1, userCount) / Math.max(1, concurrency)) * 1000,
  );
  return Math.max(baseIntervalMs, drainMs);
}

/** Spread users across a poll interval so they do not thundering-herd. */
export function staggerOffsetMs(userId: string, intervalMs: number): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const interval = Math.max(1, intervalMs);
  return Math.abs(hash) % interval;
}
