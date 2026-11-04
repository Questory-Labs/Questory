export type SearchDomain = "games" | "music" | "watch" | "read" | "friends";
export type SearchScopeFilter = "all" | SearchDomain;

export const SEARCH_DOMAIN_COLOR: Record<SearchDomain, string> = {
  games: "var(--games)",
  music: "var(--music)",
  watch: "var(--watch)",
  read: "var(--read)",
  friends: "var(--muted)",
};

export const SEARCH_SCOPE_OPTIONS: readonly { value: SearchScopeFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "var(--ink)" },
  { value: "games", label: "Games", color: SEARCH_DOMAIN_COLOR.games },
  { value: "music", label: "Music", color: SEARCH_DOMAIN_COLOR.music },
  { value: "watch", label: "Watch", color: SEARCH_DOMAIN_COLOR.watch },
  { value: "read", label: "Read", color: SEARCH_DOMAIN_COLOR.read },
  { value: "friends", label: "Friends", color: SEARCH_DOMAIN_COLOR.friends },
];

export const SEARCH_FILTER_HINTS = ["game:", "movie:", "artist:", "friend:", "within:<7d"] as const;

export const SEARCH_SOURCE_LABEL: Record<string, string> = {
  library: "Library",
  wishlist: "Wishlist",
  catalog: "Catalog",
};

export const SEARCH_USER_STATUS_LABEL: Record<string, string> = {
  playing: "Playing",
  backlog: "Backlog",
  finished: "Completed",
  dropped: "Dropped",
};
