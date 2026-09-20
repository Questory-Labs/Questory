import { z } from "zod";

export const FEATURE_DOMAINS = ["music", "watch", "read"] as const;
export const FeatureDomainSchema = z.enum(FEATURE_DOMAINS);
export type FeatureDomain = (typeof FEATURE_DOMAINS)[number];

export const FEATURE_SOURCES = [
  "lastfm",
  "listenbrainzIngest",
  "listenbrainzApi",
  "spotify",
  "musicbrainz",
  "musicImports",
  "trakt",
  "tmdb",
  "anilist",
  "mal",
  "kitsu",
  "shikimori",
  "bangumi",
  "letterboxdImport",
  "letterboxdScrape",
  "watchWebhooks",
] as const;
export const FeatureSourceSchema = z.enum(FEATURE_SOURCES);
export type FeatureSource = (typeof FEATURE_SOURCES)[number];

export const FeatureFlagOriginSchema = z.enum(["db", "env", "default"]);
export type FeatureFlagOrigin = z.infer<typeof FeatureFlagOriginSchema>;

export const DomainFlagsSchema = z.object({
  music: z.boolean(),
  watch: z.boolean(),
  read: z.boolean(),
});
export type DomainFlags = z.infer<typeof DomainFlagsSchema>;

export const SourceFlagsSchema = z.object({
  lastfm: z.boolean(),
  listenbrainzIngest: z.boolean(),
  listenbrainzApi: z.boolean(),
  spotify: z.boolean(),
  musicbrainz: z.boolean(),
  musicImports: z.boolean(),
  trakt: z.boolean(),
  tmdb: z.boolean(),
  anilist: z.boolean(),
  mal: z.boolean(),
  kitsu: z.boolean(),
  shikimori: z.boolean(),
  bangumi: z.boolean(),
  letterboxdImport: z.boolean(),
  letterboxdScrape: z.boolean(),
  watchWebhooks: z.boolean(),
});
export type SourceFlags = z.infer<typeof SourceFlagsSchema>;

export const AppStatusSchema = z.object({
  music: z.object({ enabled: z.boolean() }),
  watch: z.object({ enabled: z.boolean() }),
  read: z.object({ enabled: z.boolean() }),
  sources: SourceFlagsSchema,
});
export type AppStatus = z.infer<typeof AppStatusSchema>;

export const FlagWithOriginSchema = z.object({
  enabled: z.boolean(),
  origin: FeatureFlagOriginSchema,
});
export type FlagWithOrigin = z.infer<typeof FlagWithOriginSchema>;

export const AdminDomainFlagsSchema = z.object({
  music: FlagWithOriginSchema,
  watch: FlagWithOriginSchema,
  read: FlagWithOriginSchema,
});
export type AdminDomainFlags = z.infer<typeof AdminDomainFlagsSchema>;

export const AdminSourceFlagsSchema = z.object({
  lastfm: FlagWithOriginSchema,
  listenbrainzIngest: FlagWithOriginSchema,
  listenbrainzApi: FlagWithOriginSchema,
  spotify: FlagWithOriginSchema,
  musicbrainz: FlagWithOriginSchema,
  musicImports: FlagWithOriginSchema,
  trakt: FlagWithOriginSchema,
  tmdb: FlagWithOriginSchema,
  anilist: FlagWithOriginSchema,
  mal: FlagWithOriginSchema,
  kitsu: FlagWithOriginSchema,
  shikimori: FlagWithOriginSchema,
  bangumi: FlagWithOriginSchema,
  letterboxdImport: FlagWithOriginSchema,
  letterboxdScrape: FlagWithOriginSchema,
  watchWebhooks: FlagWithOriginSchema,
});
export type AdminSourceFlags = z.infer<typeof AdminSourceFlagsSchema>;

export const PatchFeatureFlagsSchema = z.object({
  signupEnabled: z.boolean().optional(),
  features: DomainFlagsSchema.partial().strict().optional(),
  sources: SourceFlagsSchema.partial().strict().optional(),
});
export type PatchFeatureFlags = z.infer<typeof PatchFeatureFlagsSchema>;

export const AdminInstanceSettingsSchema = z.object({
  signupEnabled: z.boolean(),
  signupOpen: z.boolean(),
  abuse: z.record(z.string(), z.number()),
  features: AdminDomainFlagsSchema,
  sources: AdminSourceFlagsSchema,
});
export type AdminInstanceSettings = z.infer<typeof AdminInstanceSettingsSchema>;

export const ListSyncScopeSchema = z.enum(["watch", "read", "both"]);
export type ListSyncScope = z.infer<typeof ListSyncScopeSchema>;

export const FEATURE_DISABLED_CODE = "FEATURE_DISABLED";

export function featureDisabledMessage(
  target: FeatureDomain | FeatureSource,
): string {
  const labels: Record<FeatureDomain | FeatureSource, string> = {
    music: "Music",
    watch: "Watch",
    read: "Read",
    lastfm: "Last.fm",
    listenbrainzIngest: "ListenBrainz ingest",
    listenbrainzApi: "ListenBrainz",
    spotify: "Spotify",
    musicbrainz: "MusicBrainz",
    musicImports: "Music imports",
    trakt: "Trakt",
    tmdb: "TMDB",
    anilist: "AniList",
    mal: "MyAnimeList",
    kitsu: "Kitsu",
    shikimori: "Shikimori",
    bangumi: "Bangumi",
    letterboxdImport: "Letterboxd import",
    letterboxdScrape: "Letterboxd scrape",
    watchWebhooks: "Watch webhooks",
  };
  return `${labels[target]} is disabled on this instance`;
}
