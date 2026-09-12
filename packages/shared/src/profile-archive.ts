import { z } from "zod";

const StoreSchema = z.enum(["steam", "epic", "gog"]);

export const QUESTORY_PROFILE_FORMAT = "questory.profile";
export const QUESTORY_PROFILE_VERSION = 1;
export const QUESTORY_PROFILE_JSON_NAME = "questory-profile.json";
export const QUESTORY_PROFILE_README_NAME = "README.txt";

const IsoDateSchema = z.string().min(1);

const GameRefSchema = z.object({
  store: StoreSchema.default("steam"),
  externalId: z.string().min(1),
  appId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).optional(),
});

const LibraryRowSchema = GameRefSchema.extend({
  playtimeForever: z.number().int().nonnegative().optional().default(0),
  playtime2Weeks: z.number().int().nullable().optional(),
  lastPlayedAt: IsoDateSchema.nullable().optional(),
  pricePaid: z.number().nullable().optional(),
  purchasedAt: IsoDateSchema.nullable().optional(),
  hidden: z.boolean().optional().default(false),
  isFamilyShared: z.boolean().optional().default(false),
});

const WishlistTargetSchema = GameRefSchema.extend({
  targetPrice: z.number(),
  priority: z.number().int().optional(),
  dateAdded: IsoDateSchema.nullable().optional(),
});

const PurchaseRowSchema = z.object({
  store: z.string().min(1).default("steam"),
  externalId: z.string().nullable().optional(),
  appId: z.number().int().positive().nullable().optional(),
  amount: z.number(),
  currency: z.string().min(1).default("USD"),
  purchasedAt: IsoDateSchema,
  source: z.string().min(1),
  discountPct: z.number().nullable().optional(),
  name: z.string().optional(),
});

const CollectionItemSchema = GameRefSchema;
const CollectionRowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().nullable().optional(),
  items: z.array(CollectionItemSchema).default([]),
});

const PlaySessionRowSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  appId: z.number().int().positive().nullable().optional(),
  startedAt: IsoDateSchema,
  endedAt: IsoDateSchema,
  durationSecs: z.number().int().nonnegative(),
  exe: z.string().nullable().optional(),
  hostOs: z.string().nullable().optional(),
  hostName: z.string().nullable().optional(),
});

const PlaySessionRuleRowSchema = z.object({
  matchKey: z.string().min(1),
  matchExeNorm: z.string().optional().default(""),
  matchTitleNorm: z.string().min(1),
  target: GameRefSchema,
});

const FamilyMemberRowSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/),
  role: z.string().min(1).default("member"),
  personaName: z.string().min(1),
  avatarUrl: z.string().nullable().optional(),
});

const FamilyRowSchema = z.object({
  name: z.string().min(1),
  members: z.array(FamilyMemberRowSchema).default([]),
});

const MusicListenRowSchema = z.object({
  listenedAt: IsoDateSchema,
  artistName: z.string().min(1),
  trackName: z.string().min(1),
  releaseName: z.string().nullable().optional(),
  recordingMbid: z.string().nullable().optional(),
  trackMbid: z.string().nullable().optional(),
  releaseMbid: z.string().nullable().optional(),
  isrc: z.string().nullable().optional(),
  spotifyId: z.string().nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  listenType: z.string().optional().default("single"),
  mediaPlayer: z.string().nullable().optional(),
  submissionClient: z.string().nullable().optional(),
  musicService: z.string().nullable().optional(),
});

const MusicArtistRefSchema = z.object({
  name: z.string().min(1),
  mbid: z.string().nullable().optional(),
});

const MusicRuleRowSchema = z.object({
  kind: z.enum(["track", "album", "artist"]),
  matchArtistNorm: z.string().min(1),
  matchAlbumNorm: z.string().nullable().optional(),
  matchTrackNorm: z.string().nullable().optional(),
  targetTrackTitle: z.string().nullable().optional(),
  targetAlbumTitle: z.string().nullable().optional(),
  artistCredit: z.string().nullable().optional(),
  targetArtists: z.array(MusicArtistRefSchema).default([]),
});

const MusicLabelRowSchema = z.object({
  entityKind: z.enum(["artist", "release", "track"]),
  displayName: z.string().min(1),
  artistName: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  mbid: z.string().nullable().optional(),
});

const WatchTitleRefSchema = z.object({
  type: z.enum(["movie", "show"]),
  name: z.string().min(1),
  year: z.number().int().nullable().optional(),
  traktId: z.number().int().nullable().optional(),
  tmdbId: z.number().int().nullable().optional(),
  imdbId: z.string().nullable().optional(),
  anilistId: z.number().int().nullable().optional(),
  malId: z.number().int().nullable().optional(),
  kitsuId: z.number().int().nullable().optional(),
  bangumiId: z.number().int().nullable().optional(),
  shikimoriId: z.number().int().nullable().optional(),
});

const WatchEpisodeRefSchema = z.object({
  seasonNumber: z.number().int(),
  episodeNumber: z.number().int(),
  name: z.string().nullable().optional(),
  traktId: z.number().int().nullable().optional(),
  tmdbId: z.number().int().nullable().optional(),
});

const WatchEventRowSchema = z.object({
  dedupeKey: z.string().min(1),
  watchedAt: IsoDateSchema,
  source: z.string().min(1),
  action: z.string().optional().default("watch"),
  progress: z.number().int().optional().default(100),
  rating: z.number().nullable().optional(),
  runtimeMinutes: z.number().int().nullable().optional(),
  precision: z.string().optional().default("second"),
  title: WatchTitleRefSchema,
  episode: WatchEpisodeRefSchema.nullable().optional(),
});

const WatchListStateRowSchema = z.object({
  listType: z.string().min(1),
  source: z.string().min(1),
  rating: z.number().nullable().optional(),
  listedAt: IsoDateSchema.nullable().optional(),
  title: WatchTitleRefSchema,
});

const ReadTitleRefSchema = z.object({
  format: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int().nullable().optional(),
  anilistId: z.number().int().nullable().optional(),
  malId: z.number().int().nullable().optional(),
  kitsuId: z.number().int().nullable().optional(),
  bangumiId: z.number().int().nullable().optional(),
  shikimoriId: z.number().int().nullable().optional(),
});

const ReadEventRowSchema = z.object({
  dedupeKey: z.string().min(1),
  readAt: IsoDateSchema,
  source: z.string().min(1),
  action: z.string().optional().default("import"),
  status: z.string().nullable().optional(),
  chaptersRead: z.number().int().nullable().optional(),
  volumesRead: z.number().int().nullable().optional(),
  progress: z.number().int().optional().default(0),
  rating: z.number().nullable().optional(),
  precision: z.string().optional().default("day"),
  title: ReadTitleRefSchema,
});

const ReadListStateRowSchema = z.object({
  listStatus: z.string().min(1),
  source: z.string().min(1),
  score: z.number().nullable().optional(),
  progressChapters: z.number().int().optional().default(0),
  progressVolumes: z.number().int().optional().default(0),
  listedAt: IsoDateSchema.nullable().optional(),
  title: ReadTitleRefSchema,
});

export const QuestoryProfileArchiveSchema = z.object({
  format: z.literal(QUESTORY_PROFILE_FORMAT),
  version: z.literal(QUESTORY_PROFILE_VERSION),
  exportedAt: IsoDateSchema,
  services: z.array(z.string().min(1)).default([]),
  profile: z
    .object({
      countryCode: z.string().nullable().optional(),
      priceRegionLocked: z.boolean().optional(),
    })
    .default({}),
  library: z.array(LibraryRowSchema).default([]),
  wishlistTargets: z.array(WishlistTargetSchema).default([]),
  purchases: z.array(PurchaseRowSchema).default([]),
  collections: z.array(CollectionRowSchema).default([]),
  playSessions: z.array(PlaySessionRowSchema).default([]),
  playSessionRules: z.array(PlaySessionRuleRowSchema).default([]),
  family: FamilyRowSchema.nullable().optional(),
  music: z
    .object({
      rules: z.array(MusicRuleRowSchema).default([]),
      labels: z.array(MusicLabelRowSchema).default([]),
      listens: z.array(MusicListenRowSchema).default([]),
    })
    .default({}),
  watch: z
    .object({
      events: z.array(WatchEventRowSchema).default([]),
      listStates: z.array(WatchListStateRowSchema).default([]),
    })
    .default({}),
  read: z
    .object({
      events: z.array(ReadEventRowSchema).default([]),
      listStates: z.array(ReadListStateRowSchema).default([]),
    })
    .default({}),
});

export type QuestoryProfileArchive = z.infer<
  typeof QuestoryProfileArchiveSchema
>;

export const ProfileExportStatusSchema = z.object({
  status: z.enum(["none", "pending", "running", "completed", "failed"]),
  inProgress: z.boolean(),
  downloadReady: z.boolean(),
  fileName: z.string().nullable(),
  byteSize: z.number().int().nullable(),
  expiresAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type ProfileExportStatus = z.infer<typeof ProfileExportStatusSchema>;

export const ProfileImportJobSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: z.string(),
  fileName: z.string().nullable().optional(),
  total: z.number(),
  accepted: z.number(),
  skipped: z.number(),
  processed: z.number(),
  percent: z.number().nullable(),
  phase: z.string(),
  lastError: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
});
export type ProfileImportJob = z.infer<typeof ProfileImportJobSchema>;
