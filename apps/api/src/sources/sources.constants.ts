import type { SourceDomain } from "@questorylabs/shared";

export type SourceProviderDef = {
  provider: string;
  kind: "connection" | "api_key";
  showAccount?: boolean;
};

export const SOURCE_DOMAIN_PROVIDERS: Record<SourceDomain, SourceProviderDef[]> = {
  music: [
    { provider: "lastfm", kind: "connection", showAccount: true },
    { provider: "music_ingest", kind: "api_key" },
  ],
  watch: [
    { provider: "trakt", kind: "connection" },
    { provider: "anilist", kind: "connection" },
    { provider: "mal", kind: "connection" },
    { provider: "kitsu", kind: "connection" },
    { provider: "bangumi", kind: "connection" },
    { provider: "shikimori", kind: "connection" },
    { provider: "letterboxd", kind: "connection", showAccount: true },
    { provider: "watch_webhook", kind: "api_key" },
  ],
  read: [
    { provider: "anilist", kind: "connection" },
    { provider: "mal", kind: "connection" },
    { provider: "kitsu", kind: "connection" },
    { provider: "bangumi", kind: "connection" },
    { provider: "shikimori", kind: "connection" },
  ],
};

export const SOURCES_ROW_LIMIT = 50;

export const SOURCES_ERROR_MAX = 200;
