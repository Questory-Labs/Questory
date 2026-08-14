/** Default page size for `GET /friends`. */
export const FRIENDS_PAGE_SIZE = 15;

/** Max friends whose libraries are stored during one sync. */
export const LIBRARY_CACHE_LIMIT = 50;

/** Max Steam GetOwnedGames calls per sync (private profiles do not store a cache). */
export const LIBRARY_CACHE_ATTEMPT_LIMIT = 100;

/** Max games stored per friend library cache. */
export const GAMES_PER_FRIEND_LIMIT = 200;
