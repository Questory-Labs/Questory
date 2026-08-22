import type { ListProviderConfig } from "@/components/sources/ListProviderCard";

export const WATCH_ANILIST: ListProviderConfig = {
  id: "anilist",
  title: "AniList",
  blurb:
    "Connect AniList to sync anime into Watch (manga syncs into Read when enabled).",
  statusPath: "/anilist/status",
  authorizePath: "/anilist/authorize",
};

export const LETTERBOXD_KINDS = [
  { id: "diary", label: "diary.csv", hint: "Logged watches" },
  { id: "ratings", label: "ratings.csv", hint: "Star ratings" },
  { id: "watched", label: "watched.csv", hint: "Marked watched" },
  { id: "watchlist", label: "watchlist.csv", hint: "Want to watch" },
] as const;

export type LetterboxdKind = (typeof LETTERBOXD_KINDS)[number]["id"];
