/** Cap how many friends we hit Steam for on a single trending build. */
export const MAX_FRIENDS = 200;
/** Parallel Steam recently-played fetches. */
export const FRIEND_CONCURRENCY = 4;
/** Delay between launching friend fetches (rate-limit cushion). */
export const FRIEND_STAGGER_MS = 180;
/** Games pulled per friend from GetRecentlyPlayedGames. */
export const RECENT_PER_FRIEND = 12;
/** Aggregate friends shelf cache. */
export const FRIENDS_CACHE_TTL = 1200;
/** How many friends shown as avatars on a tile. */
export const SAMPLE_FRIENDS = 3;
export const FRIENDS_TOP_N = 16;
export const GLOBAL_TOP_N = 20;
export const CHART_TOP_N = 20;
