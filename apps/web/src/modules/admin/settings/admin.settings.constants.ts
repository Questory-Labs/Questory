import type { FeatureDomain, FeatureSource } from "@questorylabs/shared";

export const FEATURE_FLAG_ROWS: Array<{
  id: FeatureDomain;
  label: string;
  hint: string;
  dot: string;
}> = [
  {
    id: "music",
    label: "Music",
    hint: "Listening analytics, Last.fm polling, and ListenBrainz ingest.",
    dot: "text-[var(--music)]",
  },
  {
    id: "watch",
    label: "Watch",
    hint: "Movies and shows: Trakt, TMDB, Letterboxd, and anime lists.",
    dot: "text-[var(--watch)]",
  },
  {
    id: "read",
    label: "Read",
    hint: "Manga, manhwa, and novels from shared list providers.",
    dot: "text-[var(--read)]",
  },
];

export const SOURCE_FLAG_GROUPS: Array<{
  title: string;
  dot: string;
  items: Array<{ id: FeatureSource; label: string; hint: string }>;
}> = [
  {
    title: "Music sources",
    dot: "text-[var(--music)]",
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
    dot: "text-[var(--watch)]",
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
    dot: "text-[var(--read)]",
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

export const ABUSE_LIMIT_LABELS: Record<string, string> = {
  registerIpHour: "Signups per IP",
  registerIpDay: "Signups per IP",
  registerEmailDay: "Signups per email",
  loginIp: "Login attempts per IP",
  loginEmail: "Login attempts per email",
  challengeIp: "Challenges per IP",
};
