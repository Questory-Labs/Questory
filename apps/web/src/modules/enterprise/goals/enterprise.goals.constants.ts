import { GOAL_LIST_MAX_LIMIT } from "@questorylabs/shared";

export type GoalsTab = "week" | "history";

export const GOAL_TAB_OPTIONS: readonly { value: GoalsTab; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "history", label: "History" },
];

export const GOAL_TIMEFRAME = "week";
export const SMART_GOAL_TIMEFRAME = "this week";
export const GOALS_HISTORY_LIMIT = GOAL_LIST_MAX_LIMIT;

export const GOAL_TARGET_COUNTS = [1, 3, 5, 10] as const;
export const GOAL_DEFAULT_TARGET = 5;
export const GOALS_LIST_LIMIT = 50;
export const GOALS_STATS_DAYS = 30;
export const GOALS_RESOURCE_ID = ["goals"] as const;
export const AI_GOALS_RESOURCE_ID = ["ai-goals"] as const;
export const GOAL_SOURCE_LINKS = [
  { key: "games", label: "Steam", detail: "Your library and playtime", href: "/settings/stores" },
  { key: "music", label: "Music", detail: "Last.fm or ListenBrainz scrobbles", href: "/sources" },
  { key: "watch", label: "Watch", detail: "Trakt, AniList, Letterboxd and more", href: "/sources" },
  { key: "read", label: "Read", detail: "AniList, MyAnimeList and more", href: "/sources" },
] as const;
