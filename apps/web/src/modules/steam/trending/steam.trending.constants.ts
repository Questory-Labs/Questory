export type TrendingTab = "games" | "music" | "watch" | "read";

export const TRENDING_TABS: readonly { value: TrendingTab; label: string; color: string }[] = [
  { value: "games", label: "Games", color: "var(--games)" },
  { value: "music", label: "Music", color: "var(--music)" },
  { value: "watch", label: "Watch", color: "var(--watch)" },
  { value: "read", label: "Read", color: "var(--read)" },
];

export const TRENDING_TAB_WIDTH = 90;
export const TRENDING_SKELETON_COUNT = 6;
export const TRENDING_GRID_CLASS =
  "mt-3.5 grid list-none grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 p-0";

export const DECK_BADGE_LABEL: Record<string, string> = {
  verified: "Deck Verified",
  playable: "Deck Playable",
};
