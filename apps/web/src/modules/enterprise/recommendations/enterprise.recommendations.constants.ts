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

export const DOMAIN_COLOR: Record<RecommendationDomain | "all", string> = {
  all: "var(--ink)",
  games: "var(--games)",
  music: "var(--music)",
  watch: "var(--watch)",
  read: "var(--read)",
};

export const MOOD_CHIPS = [
  "Short and calm",
  "Co-op with friends",
  "Something new",
  "Finish what I started",
  "Background while working",
];

export const DAY_PARTS: { until: number; label: string }[] = [
  { until: 5, label: "night" },
  { until: 12, label: "morning" },
  { until: 17, label: "afternoon" },
  { until: 21, label: "evening" },
  { until: 24, label: "night" },
];

export const FEEDBACK_BUTTON_CLASS =
  "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] transition-[transform,background-color,border-color,color] duration-500 hover:-translate-y-0.5 disabled:opacity-50";

export const GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(min(330px,100%),1fr))] gap-3.5";
