export const LETTERBOXD_WATCH_DEDUPE_MIGRATION_KEY =
  "letterboxd_watch_dedupe_v1";

export type MigrationDefinition = {
  key: string;
  name: string;
  description: string;
};

export const MIGRATION_DEFINITIONS: MigrationDefinition[] = [
  {
    key: LETTERBOXD_WATCH_DEDUPE_MIGRATION_KEY,
    name: "Letterboxd watch dedupe",
    description:
      "Merge duplicate Letterboxd diary/watched/scrape events and normalize dedupe keys across CSV imports and scrape sync.",
  },
];

export function getMigrationDefinition(key: string): MigrationDefinition | null {
  return MIGRATION_DEFINITIONS.find((m) => m.key === key) ?? null;
}
