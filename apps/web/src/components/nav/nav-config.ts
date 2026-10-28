export type NavItem = { href: string; label: string; icon: NavIconName; also?: string[] };
export type NavSectionKey = "everywhere" | "games" | "music" | "watch" | "read";
export type NavGroup = {
  key: NavSectionKey;
  label: string;
  items: NavItem[];
  collapsible: boolean;
};

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
  | "sources"
  | "goals"
  | "settings"
  | "admin";

const REWIND: NavItem = {
  href: "/rewind",
  label: "Rewind",
  icon: "rewind",
  also: ["/library/rewind", "/music/rewind", "/watch/rewind", "/read/rewind"],
};

const GAMES: NavItem[] = [
  { href: "/library", label: "Library", icon: "library" },
  { href: "/wishlist", label: "Wishlist", icon: "wishlist" },
  { href: "/collections", label: "Collections", icon: "collections" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/cost", label: "Cost", icon: "cost" },
  { href: "/trending", label: "Trending", icon: "trending" },
  { href: "/friends", label: "Friends", icon: "friends" },
  { href: "/multiplayer", label: "Multiplayer", icon: "multiplayer" },
  { href: "/family", label: "Family", icon: "family" },
];

export const ACCOUNT_LINKS = [
  { href: "/settings/profile", label: "Profile", hint: "Account, region & data" },
  {
    href: "/settings/connections",
    label: "Connections",
    hint: "Steam, stores, music, watch",
  },
] as const;

export const MUSIC_SUBNAV: NavItem[] = [
  { href: "/music", label: "Overview", icon: "music" },
  { href: "/music/listening", label: "Listening", icon: "listening" },
  { href: "/music/charts", label: "Top charts", icon: "charts" },
];

export const WATCH_SUBNAV: NavItem[] = [
  { href: "/watch", label: "Overview", icon: "watch" },
  { href: "/watch/history", label: "History", icon: "history" },
];

export const READ_SUBNAV: NavItem[] = [
  { href: "/read", label: "Overview", icon: "read" },
  {
    href: "/read/library",
    label: "Library & history",
    icon: "library",
    also: ["/read/history"],
  },
];

export type NavFlags = {
  music?: boolean;
  watch?: boolean;
  read?: boolean;
  enterprise?: boolean;
};

export const buildNavGroups = (flags: NavFlags): NavGroup[] => {
  const everywhere: NavItem[] = [{ href: "/dashboard", label: "Home", icon: "dashboard" }];
  if (flags.enterprise) {
    everywhere.push(
      { href: "/recommendations", label: "For you", icon: "recs" },
      { href: "/recommendations/goals", label: "Goals", icon: "goals" },
    );
  }
  everywhere.push(REWIND);
  const groups: NavGroup[] = [
    { key: "everywhere", label: "Everywhere", items: everywhere, collapsible: false },
    { key: "games", label: "Games", items: GAMES, collapsible: true },
  ];
  if (flags.music)
    groups.push({ key: "music", label: "Music", items: MUSIC_SUBNAV, collapsible: true });
  if (flags.watch)
    groups.push({ key: "watch", label: "Watch", items: WATCH_SUBNAV, collapsible: true });
  if (flags.read)
    groups.push({ key: "read", label: "Read", items: READ_SUBNAV, collapsible: true });
  return groups;
};

export const buildNavFooter = (flags: NavFlags & { admin?: boolean }): NavItem[] => {
  const items: NavItem[] = [];
  if (flags.music || flags.watch || flags.read) {
    items.push({
      href: "/sources",
      label: "Sources",
      icon: "sources",
      also: ["/music/settings", "/watch/settings", "/read/settings"],
    });
  }
  items.push({ href: "/settings/connections", label: "Settings", icon: "settings", also: ["/settings"] });
  if (flags.admin) items.push({ href: "/admin", label: "Admin", icon: "admin" });
  return items;
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

const itemPaths = (item: NavItem) => [item.href, ...(item.also ?? [])];

export const activeNavHref = (pathname: string, items: NavItem[]) => {
  let best: { href: string; length: number } | null = null;
  for (const item of items) {
    for (const path of itemPaths(item)) {
      const pathOnly = path.split("?")[0];
      if (!pathMatches(pathname, pathOnly)) continue;
      if (!best || pathOnly.length > best.length) best = { href: item.href, length: pathOnly.length };
    }
  }
  return best?.href ?? null;
};

export const activeSectionKey = (pathname: string, groups: NavGroup[]) => {
  const href = activeNavHref(
    pathname,
    groups.flatMap((g) => g.items),
  );
  return groups.find((g) => g.items.some((i) => i.href === href))?.key ?? null;
};

const NAV_COUNT_FORMAT = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNavCount(n: number): string {
  return NAV_COUNT_FORMAT.format(n).toLowerCase();
}
