import type { ReadLibrarySort, ReadListStatus } from "@questorylabs/shared";

export const LIBRARY_STATUSES: { value: "" | ReadListStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "planning", label: "Planning" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
  { value: "repeating", label: "Repeating" },
];

export const LIBRARY_FORMATS = [
  { value: "", label: "All formats" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "novel", label: "Novel" },
  { value: "one_shot", label: "One-shot" },
  { value: "other", label: "Other" },
];

export const LIBRARY_CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "manga", label: "Manga" },
  { value: "novel", label: "Novel" },
  { value: "fiction", label: "Fiction" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "comic", label: "Comic" },
];

export const LIBRARY_SORTS: { value: ReadLibrarySort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "score", label: "Score" },
  { value: "title", label: "Title" },
];

export const READ_STATUS_COLOR: Record<string, string> = {
  reading: "var(--read)",
  completed: "var(--ok)",
  planning: "var(--muted)",
  paused: "var(--warn)",
  dropped: "var(--danger)",
  repeating: "var(--ink)",
};

export const readStatusColor = (status: string | null | undefined): string =>
  (status && READ_STATUS_COLOR[status]) || "var(--ink)";

export const readStatusLabel = (status: string | null | undefined): string =>
  LIBRARY_STATUSES.find((s) => s.value === status)?.label ?? status ?? "";
