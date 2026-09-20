import type { FeatureDomain, FeatureSource } from "@questorylabs/shared";

export const FEATURE_FLAG_ROWS: Array<{
  id: FeatureDomain;
  label: string;
  hint: string;
}> = [
  {
    id: "music",
    label: "Music",
    hint: "Listening analytics, Last.fm polling, and ListenBrainz ingest.",
  },
  {
    id: "watch",
    label: "Watch",
    hint: "Movies and shows: Trakt, TMDB, Letterboxd, and anime lists.",
  },
  {
    id: "read",
    label: "Read",
    hint: "Manga, manhwa, and novels from shared list providers.",
  },
];

export const SOURCE_FLAG_GROUPS: Array<{
  title: string;
  items: Array<{ id: FeatureSource; label: string; hint: string }>;
}> = [
  {
    title: "Music sources",
    items: [
      { id: "lastfm", label: "Last.fm", hint: "Native Last.fm polling." },
      {
        id: "listenbrainzIngest",
        label: "ListenBrainz ingest",
        hint: "Multi-scrobbler / ListenBrainz-compatible submit-listens.",
      },
      {
        id: "listenbrainzApi",
        label: "ListenBrainz charts",
        hint: "Sitewide ListenBrainz trending on Steam trending.",
      },
      {
        id: "spotify",
        label: "Spotify import",
        hint: "Streaming_History_Audio JSON import only — not OAuth.",
      },
      {
        id: "musicbrainz",
        label: "MusicBrainz",
        hint: "Track/artist enrichment.",
      },
      {
        id: "musicImports",
        label: "Music imports",
        hint: "History upload (Koito, Last.fm JSON, ListenBrainz zip, …).",
      },
    ],
  },
  {
    title: "Watch sources",
    items: [
      { id: "trakt", label: "Trakt", hint: "OAuth watched-history sync." },
      { id: "tmdb", label: "TMDB", hint: "Metadata enrichment and trending." },
      {
        id: "letterboxdImport",
        label: "Letterboxd import",
        hint: "CSV / zip diary import.",
      },
      {
        id: "letterboxdScrape",
        label: "Letterboxd scrape",
        hint: "Admin-configured scrape sync.",
      },
      {
        id: "watchWebhooks",
        label: "Plex / Jellyfin webhooks",
        hint: "Live player webhooks.",
      },
    ],
  },
  {
    title: "Shared list providers",
    items: [
      {
        id: "anilist",
        label: "AniList",
        hint: "Anime into Watch, manga into Read.",
      },
      {
        id: "mal",
        label: "MyAnimeList",
        hint: "Anime into Watch, manga into Read.",
      },
      { id: "kitsu", label: "Kitsu", hint: "Anime into Watch, manga into Read." },
      {
        id: "shikimori",
        label: "Shikimori",
        hint: "Anime into Watch, manga into Read.",
      },
      {
        id: "bangumi",
        label: "Bangumi",
        hint: "Anime into Watch, manga into Read.",
      },
    ],
  },
];
