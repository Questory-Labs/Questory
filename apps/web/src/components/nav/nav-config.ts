export type NavItem = { href: string; label: string; icon: NavIconName };
export type NavGroup = { label: string; items: NavItem[] };

export type NavIconName =
  | "dashboard"
  | "library"
  | "wishlist"
  | "cost"
  | "friends"
  | "trending"
  | "collections"
  | "sessions"
  | "family"
  | "multiplayer"
  | "music"
  | "watch"
  | "read"
  | "recs"
  | "listening"
  | "charts"
  | "history"
  | "rewind"
  | "sources";

const STEAM_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/trending", label: "Trending", icon: "trending" },
    ],
  },
  {
    label: "Your games",
    items: [
      { href: "/library", label: "Library", icon: "library" },
      { href: "/wishlist", label: "Wishlist", icon: "wishlist" },
      { href: "/collections", label: "Collections", icon: "collections" },
      { href: "/sessions", label: "Sessions", icon: "sessions" },
      { href: "/cost", label: "Cost", icon: "cost" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/friends", label: "Friends", icon: "friends" },
      { href: "/multiplayer", label: "Multiplayer", icon: "multiplayer" },
      { href: "/family", label: "Family", icon: "family" },
    ],
  },
];

export const ACCOUNT_LINKS = [
  { href: "/settings/profile", label: "Profile", hint: "Account & price region" },
  {
    href: "/settings/connections",
    label: "Connections",
    hint: "Steam, stores, music, watch",
  },
] as const;

export const MUSIC_SUBNAV: NavItem[] = [
  { href: "/music", label: "Home", icon: "music" },
  { href: "/music/listening", label: "Listening", icon: "listening" },
  { href: "/music/charts", label: "Charts", icon: "charts" },
  { href: "/music/rewind", label: "Rewind", icon: "rewind" },
  { href: "/music/settings", label: "Sources", icon: "sources" },
];

export const WATCH_SUBNAV: NavItem[] = [
  { href: "/watch", label: "Home", icon: "watch" },
  { href: "/watch/history", label: "History", icon: "history" },
  { href: "/watch/rewind", label: "Rewind", icon: "rewind" },
  { href: "/watch/settings", label: "Sources", icon: "sources" },
];

export const READ_SUBNAV: NavItem[] = [
  { href: "/read", label: "Home", icon: "read" },
  { href: "/read/library", label: "Library", icon: "library" },
  { href: "/read/history", label: "History", icon: "history" },
  { href: "/read/rewind", label: "Rewind", icon: "rewind" },
  { href: "/read/settings", label: "Sources", icon: "sources" },
];

export const buildNavGroups = (flags: {
  music?: boolean;
  watch?: boolean;
  read?: boolean;
  enterprise?: boolean;
}): NavGroup[] => {
  const groups = STEAM_GROUPS.map((g) => ({
    ...g,
    items: [...g.items],
  }));
  if (flags.enterprise) {
    groups.splice(1, 0, {
      label: "For you",
      items: [{ href: "/recommendations", label: "Recommendations", icon: "recs" }],
    });
  }
  if (flags.music) groups.push({ label: "Music", items: MUSIC_SUBNAV });
  if (flags.watch) groups.push({ label: "Watch", items: WATCH_SUBNAV });
  if (flags.read) groups.push({ label: "Read", items: READ_SUBNAV });
  return groups;
};

export const pathMatches = (pathname: string, href: string) => {
  const pathOnly = href.split("?")[0];
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
};

/** Prefer the longest matching nav href so /music doesn't stay active on /music/listening. */
export const isActive = (pathname: string, href: string, candidates: string[]) => {
  const pathOnly = href.split("?")[0];
  if (!pathMatches(pathname, pathOnly)) return false;
  const best = candidates
    .map((h) => h.split("?")[0])
    .filter((h) => pathMatches(pathname, h))
    .reduce((a, b) => (b.length > a.length ? b : a));
  return best === pathOnly;
};
