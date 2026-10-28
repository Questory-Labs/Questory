import type {
  Domain,
  RequeueDomain,
  StatusFilter,
} from "./admin.enrichment.types";

export const TABS: { id: Domain; label: string; hint: string }[] = [
  { id: "game", label: "Game", hint: "Steam metadata refresh jobs" },
  { id: "music", label: "Music", hint: "MusicBrainz track enrichment" },
  { id: "watch", label: "Watch", hint: "TMDB / AniList title enrichment" },
];

export const DOMAIN_OPTIONS = TABS.map((tab) => ({
  value: tab.id,
  label: tab.label,
}));

export const REQUEUE_DOMAINS: readonly RequeueDomain[] = ["music", "watch"];

export const isRequeueDomain = (domain: Domain): domain is RequeueDomain =>
  (REQUEUE_DOMAINS as readonly Domain[]).includes(domain);

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "running", label: "Running" },
  { id: "completed", label: "Done" },
  { id: "failed", label: "Failed" },
];

export const STATUS_OPTIONS = STATUS_FILTERS.map((filter) => ({
  value: filter.id,
  label: filter.label,
}));
