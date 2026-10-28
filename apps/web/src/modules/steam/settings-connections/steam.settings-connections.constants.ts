import type { SourceDomain } from "@questorylabs/shared";

export const CONNECTION_PROVIDER_LABELS: Record<string, string> = {
  lastfm: "Last.fm",
  music_ingest: "ListenBrainz ingest",
  trakt: "Trakt",
  anilist: "AniList",
  mal: "MyAnimeList",
  kitsu: "Kitsu",
  bangumi: "Bangumi",
  shikimori: "Shikimori",
  letterboxd: "Letterboxd",
  watch_webhook: "Plex / Jellyfin webhook",
};

export const CONNECTION_MODULES: Record<
  SourceDomain,
  { name: string; color: string; tint: string; description: string }
> = {
  music: {
    name: "Music",
    color: "var(--music)",
    tint: "rgba(240,168,184,0.06)",
    description:
      "Set up live multi-scrobbler ingest and enrich with Spotify / Last.fm / Koito history under Music sources. Spotify OAuth linking is not available yet.",
  },
  watch: {
    name: "Watch",
    color: "var(--watch)",
    tint: "rgba(230,194,122,0.06)",
    description:
      "Connect live sources and enrich with Letterboxd history from Watch settings.",
  },
  read: {
    name: "Read",
    color: "var(--read)",
    tint: "rgba(174,185,242,0.06)",
    description:
      "Sync manga, manhwa, and novels from AniList into Read analytics. Shares the same AniList connection as Watch anime.",
  },
};

export const GAMES_MODULE = {
  name: "Games",
  color: "var(--games)",
  tint: "rgba(143,214,196,0.07)",
};
