import type { RecommendationDomain, RecommendationItem } from "@/lib/enterprise-types";

export const TABS: { id: RecommendationDomain | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "games", label: "Games" },
  { id: "music", label: "Music" },
  { id: "watch", label: "Watch" },
  { id: "read", label: "Read" },
];

export const KIND_LABELS: Record<RecommendationItem["kind"], string> = {
  game: "Game",
  artist: "Artist",
  track: "Track",
  movie: "Movie",
  show: "Show",
  manga: "Manga",
  external: "Extra",
  lifestyle: "Break",
};
