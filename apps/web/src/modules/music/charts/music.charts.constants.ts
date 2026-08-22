export type TopsKind = "artists" | "albums" | "tracks" | "genres" | "moods";

export const CHART_KINDS: { value: TopsKind; label: string }[] = [
  { value: "artists", label: "Artists" },
  { value: "albums", label: "Albums" },
  { value: "tracks", label: "Tracks" },
  { value: "genres", label: "Genres" },
  { value: "moods", label: "Moods" },
];

export const RANGE_LABELS = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 365 days",
  all: "All time",
} as const;
