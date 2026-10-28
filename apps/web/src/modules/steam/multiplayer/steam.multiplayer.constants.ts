import type { MultiplayerPlanSort } from "@questorylabs/shared";

export const GENRES = [
  "Action",
  "Adventure",
  "Casual",
  "Indie",
  "RPG",
  "Simulation",
  "Strategy",
  "Sports",
  "Racing",
  "Massively Multiplayer",
] as const;

export const PLAYER_MIN = 2;
export const PLAYER_MAX = 16;
export const YEAR_MIN = 2000;
export const YEAR_MAX = new Date().getFullYear();

export const SORT_OPTIONS: { value: MultiplayerPlanSort; label: string }[] = [
  { value: "popularity", label: "Best match" },
  { value: "playedTogether", label: "Most played together" },
  { value: "release", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "review", label: "Reviews" },
  { value: "name", label: "Name" },
];

export type MultiplayerMode =
  | "local_coop"
  | "online_coop"
  | "pvp"
  | "crossplay"
  | "";

export const MODE_OPTIONS: { value: MultiplayerMode; label: string }[] = [
  { value: "", label: "Any" },
  { value: "online_coop", label: "Online co-op" },
  { value: "local_coop", label: "Local co-op" },
  { value: "pvp", label: "PvP" },
  { value: "crossplay", label: "Crossplay" },
];

export const PARTY_PICKER_LIMIT = 12;
