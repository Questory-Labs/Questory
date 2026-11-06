export type Shot = {
  id: string;
  path: string;
  linkFrom?: RegExp;
  fullPage?: boolean;
};

export const SHOTS: readonly Shot[] = [
  { id: "steam-dashboard", path: "/dashboard", fullPage: true },
  { id: "steam-library", path: "/library" },
  { id: "steam-game-detail", path: "/library", linkFrom: /^\/library\/(?!rewind)[^/]+$/ },
  { id: "steam-rewind", path: "/library/rewind" },
  { id: "steam-sessions", path: "/sessions" },
  { id: "steam-wishlist", path: "/wishlist" },
  { id: "steam-cost", path: "/cost" },
  { id: "steam-collections", path: "/collections" },
  { id: "steam-friends", path: "/friends" },
  { id: "steam-multiplayer", path: "/multiplayer" },
  { id: "steam-family", path: "/family" },
  { id: "steam-trending", path: "/trending" },
  { id: "music-dashboard", path: "/music", fullPage: true },
  { id: "music-listening", path: "/music/listening" },
  { id: "music-top-charts", path: "/music/charts" },
  { id: "music-rewind", path: "/music/rewind" },
  { id: "music-artist-insights", path: "/music/charts", linkFrom: /^\/music\/artists\/[^/]+$/ },
  { id: "music-album-insights", path: "/music", linkFrom: /^\/music\/albums\/[^/]+$/ },
  { id: "music-track-insights", path: "/music", linkFrom: /^\/music\/tracks\/[^/]+$/ },
  { id: "watch-dashboard", path: "/watch", fullPage: true },
  { id: "watch-history", path: "/watch/history" },
  { id: "watch-rewind", path: "/watch/rewind" },
  { id: "watch-title", path: "/watch/history", linkFrom: /^\/watch\/titles\/[^/]+$/ },
  { id: "read-dashboard", path: "/read", fullPage: true },
  { id: "read-library", path: "/read/library" },
  { id: "read-history", path: "/read/history" },
  { id: "read-rewind", path: "/read/rewind" },
  { id: "read-title", path: "/read/history", linkFrom: /^\/read\/titles\/[^/]+$/ },
  { id: "qengine-recommendations", path: "/recommendations", fullPage: true },
  { id: "qengine-goals", path: "/recommendations/goals" },
  { id: "unified-rewind", path: "/rewind", fullPage: true },
];
