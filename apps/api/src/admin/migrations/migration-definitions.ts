export const LETTERBOXD_WATCH_DEDUPE_MIGRATION_KEY =
  "letterboxd_watch_dedupe_v1";

export const BANGUMI_DEDUPE_KEYS_MIGRATION_KEY = "bangumi_dedupe_keys_v1";
export const WEBHOOK_MUSIC_EVENTS_MIGRATION_KEY = "webhook_music_events_v1";
export const WATCH_HOUR_BUCKETS_MIGRATION_KEY = "watch_hour_buckets_rebuild_v1";

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
  {
    key: BANGUMI_DEDUPE_KEYS_MIGRATION_KEY,
    name: "Bangumi dedupe keys",
    description:
      "Rewrite legacy bangumi:*:undefined:* keys to subject-based keys so re-sync does not duplicate them, deleting rows the new key already covers.",
  },
  {
    key: WEBHOOK_MUSIC_EVENTS_MIGRATION_KEY,
    name: "Webhook music events",
    description:
      "Delete Plex and Jellyfin music plays that were stored as show watches. Other Jellyfin rows are only counted.",
  },
  {
    key: WATCH_HOUR_BUCKETS_MIGRATION_KEY,
    name: "Watch hour buckets",
    description:
      "Rebuild every user's watch hour buckets from their watch events to remove counts inflated by repeat syncs.",
  },
];

export function getMigrationDefinition(key: string): MigrationDefinition | null {
  return MIGRATION_DEFINITIONS.find((m) => m.key === key) ?? null;
}
