import type {
  LibrarySort,
  LibraryStatusFilter,
  LibraryUserStatus,
} from "@questorylabs/shared";

export const LIBRARY_STATUS_LABELS: Record<LibraryUserStatus, string> = {
  playing: "Playing",
  backlog: "Backlog",
  shelved: "Shelved",
  finished: "Finished",
  dropped: "Dropped",
};

export const LIBRARY_STATUS_TONE: Record<LibraryUserStatus, string> = {
  playing: "text-[var(--ok)]",
  backlog: "text-[var(--muted)]",
  shelved: "text-[var(--faint)]",
  finished: "text-[var(--ink)]",
  dropped: "text-[var(--warn)]",
};

export const LIBRARY_STATUS_FILTERS: readonly {
  value: LibraryStatusFilter | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "playing", label: "Playing" },
  { value: "backlog", label: "Backlog" },
  { value: "shelved", label: "Shelved" },
  { value: "finished", label: "Finished" },
  { value: "dropped", label: "Dropped" },
  { value: "neverPlayed", label: "Never played" },
];

export const LIBRARY_SORT_OPTIONS: readonly { value: LibrarySort; label: string }[] = [
  { value: "lastPlayed", label: "Last played" },
  { value: "hours", label: "Hours" },
  { value: "valuePerHour", label: "Value per hour" },
  { value: "name", label: "Name" },
];

export type LibraryLayout = "grid" | "table";

export const LIBRARY_LAYOUT_OPTIONS: readonly { value: LibraryLayout; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "table", label: "Table" },
];

export const LIBRARY_SHELF_LIMIT = 6;
