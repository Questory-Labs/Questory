export const LIBRARY_GAME_FRIEND_LIMIT = 24;
export const LIBRARY_GAME_COVER_CLASS = "max-w-xl";

export type LibraryGameTab = "overview" | "achievements" | "market" | "catalog";

export const LIBRARY_GAME_TABS: readonly { value: LibraryGameTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "achievements", label: "Achievements" },
  { value: "market", label: "Market" },
  { value: "catalog", label: "Catalog" },
];

export const PRICE_CHART_WIDTH = 800;
export const PRICE_CHART_HEIGHT = 200;
export const PRICE_CHART_PAD = 24;
export const SESSION_BAR_MIN_PCT = 2;
