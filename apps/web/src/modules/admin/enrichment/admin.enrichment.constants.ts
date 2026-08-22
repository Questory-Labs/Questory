import type { Domain, StatusFilter } from "./admin.enrichment.types";

export const TABS: { id: Domain; label: string; hint: string }[] = [
  { id: "music", label: "Music", hint: "MusicBrainz track enrichment" },
  { id: "watch", label: "Watch", hint: "TMDB / AniList title enrichment" },
  { id: "game", label: "Game", hint: "Steam metadata refresh jobs" },
];

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "running", label: "Running" },
  { id: "completed", label: "Done" },
  { id: "failed", label: "Failed" },
];
