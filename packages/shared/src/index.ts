import { z } from "zod";

/** URI version segment for Nest apps (api / music / watch). */
export const API_VERSION = "1";
export const API_PREFIX = `/v${API_VERSION}`;

/**
 * Prepend `/v1` unless the path is already versioned (`/vN/...`)
 * or matches a VERSION_NEUTRAL prefix (`/auth`, `/health`, …).
 */
export function withApiVersion(
  path: string,
  neutralPrefixes: readonly string[] = [],
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (/^\/v\d+(\/|$)/.test(normalized)) return normalized;
  for (const prefix of neutralPrefixes) {
    const p = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    if (normalized === p || normalized.startsWith(`${p}/`)) {
      return normalized;
    }
  }
  return `${API_PREFIX}${normalized}`;
}

export const StoreSchema = z.enum(["steam", "epic", "gog"]);
export type Store = z.infer<typeof StoreSchema>;

export const UserSchema = z.object({
  id: z.string(),
  /** From Account(provider=steam); null for non-Steam identities. */
  steamId: z.string().nullable(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  countryCode: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const ApiKeyTypeSchema = z.enum(["music_ingest", "watch_webhook"]);
export type ApiKeyType = z.infer<typeof ApiKeyTypeSchema>;

export const ApiKeyMetaSchema = z.object({
  id: z.string(),
  type: ApiKeyTypeSchema,
  tokenPrefix: z.string(),
  label: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  lastUsedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type ApiKeyMeta = z.infer<typeof ApiKeyMetaSchema>;

export const StoreAccountStatusSchema = z.object({
  store: StoreSchema,
  connected: z.boolean(),
  /** Live account sync is only enabled for Steam today. */
  syncEnabled: z.boolean().optional(),
  status: z.enum(["connected", "coming_later"]).optional(),
  displayName: z.string().nullable().optional(),
  externalUserId: z.string().nullable().optional(),
  lastSyncedAt: z.string().nullable().optional(),
});
export type StoreAccountStatus = z.infer<typeof StoreAccountStatusSchema>;

export const GameStoreListingSchema = z.object({
  id: z.string(),
  store: StoreSchema,
  externalId: z.string(),
  headerImage: z.string().nullable().optional(),
  storeUrl: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
  currentPrice: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  priceCurrency: z.string().nullable().optional(),
});
export type GameStoreListing = z.infer<typeof GameStoreListingSchema>;

export const LibraryOwnershipSchema = z.object({
  store: StoreSchema,
  playtimeForever: z.number(),
  lastPlayedAt: z.string().nullable().optional(),
  pricePaid: z.number().nullable().optional(),
  isFamilyShared: z.boolean().optional(),
  listing: GameStoreListingSchema.nullable().optional(),
});
export type LibraryOwnership = z.infer<typeof LibraryOwnershipSchema>;

export const GameSchema = z.object({
  id: z.string(),
  appId: z.number().nullable(),
  name: z.string(),
  headerImage: z.string().nullable(),
  releaseDate: z.string().nullable().optional(),
  genres: z.array(z.string()),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  reviewScore: z.number().nullable().optional(),
  isFree: z.boolean().optional(),
  currentPrice: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  deckStatus: z.string().nullable().optional(),
  controllers: z.array(z.string()).optional(),
  multiplayerCaps: z.array(z.string()).optional(),
  stores: z.array(StoreSchema).optional(),
  listings: z.array(GameStoreListingSchema).optional(),
});
export type Game = z.infer<typeof GameSchema>;

export const LibraryEntrySchema = z.object({
  id: z.string(),
  playtimeForever: z.number(),
  playtime2Weeks: z.number().nullable().optional(),
  lastPlayedAt: z.string().nullable().optional(),
  pricePaid: z.number().nullable().optional(),
  purchasedAt: z.string().nullable().optional(),
  isFamilyShared: z.boolean().optional(),
  hidden: z.boolean().optional(),
  stores: z.array(StoreSchema).optional(),
  ownerships: z.array(LibraryOwnershipSchema).optional(),
  game: GameSchema,
});
export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

export const DashboardStatsSchema = z.object({
  librarySize: z.number(),
  totalPlaytimeHours: z.number(),
  unplayedCount: z.number(),
  wishlistCount: z.number(),
  activeFriends: z.number(),
  nearCompletionCount: z.number(),
  currentSalesCount: z.number(),
  costPerHour: z.number().nullable().optional(),
  lifetimeAtCurrent: z.number().nullable().optional(),
  currency: z.string().optional(),
  recentlyPlayed: z.array(
    z.object({
      appId: z.number(),
      name: z.string(),
      headerImage: z.string().nullable(),
      playtimeForever: z.number(),
      lastPlayedAt: z.string().nullable(),
    }),
  ),
  syncStatus: z
    .object({
      status: z.enum(["pending", "running", "completed", "failed"]),
      type: z.string().optional(),
      error: z.string().nullable().optional(),
      finishedAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const WishlistItemSchema = z.object({
  id: z.string(),
  store: StoreSchema,
  externalId: z.string(),
  appId: z.number().nullable().optional(),
  gameId: z.string().nullable().optional(),
  name: z.string(),
  headerImage: z.string().nullable(),
  priority: z.number(),
  dateAdded: z.string().nullable(),
  targetPrice: z.number().nullable(),
  currentPrice: z.number().nullable(),
  lowestPrice: z.number().nullable(),
  shouldBuyScore: z.number().nullable(),
  genres: z.array(z.string()),
});
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

export const CostSummarySchema = z.object({
  lifetimeSpending: z.number(),
  lifetimeAtCurrent: z.number(),
  lifetimeAtLowest: z.number(),
  pricedGameCount: z.number(),
  librarySize: z.number(),
  usingStoreEstimates: z.boolean(),
  currency: z.string(),
  costPerHour: z.number(),
  moneyWasted: z.number(),
  neverPlayedCount: z.number(),
  underOneHourCount: z.number(),
  salePurchaseCount: z.number(),
  averageDiscount: z.number(),
  byGenre: z.array(z.object({ genre: z.string(), amount: z.number() })),
  byPublisher: z.array(z.object({ publisher: z.string(), amount: z.number() })),
});
export type CostSummary = z.infer<typeof CostSummarySchema>;

export const CostRoiRowSchema = z.object({
  gameId: z.string().optional(),
  appId: z.number().nullable(),
  name: z.string(),
  headerImage: z.string().nullable().optional(),
  stores: z.array(StoreSchema).optional(),
  amount: z.number(),
  currentPrice: z.number().nullable(),
  lowestPrice: z.number().nullable(),
  hours: z.number(),
  costPerHour: z.number().nullable(),
  priceSource: z.enum(["paid", "store"]),
});
export type CostRoiRow = z.infer<typeof CostRoiRowSchema>;

export const FriendSchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  friendUserId: z.string().nullable().optional(),
  libraryCached: z.boolean().optional(),
});
export type Friend = z.infer<typeof FriendSchema>;

export const FriendCompareSchema = z.object({
  friend: FriendSchema,
  commonGames: z.number(),
  uniqueToYou: z.number(),
  uniqueToFriend: z.number(),
  yourPlaytimeHours: z.number(),
  friendPlaytimeHours: z.number(),
  favoriteGenresYou: z.array(z.string()),
  favoriteGenresFriend: z.array(z.string()),
  mutualWishlist: z.number(),
  libraryValueYou: z.number(),
  libraryValueFriend: z.number(),
  challengeGames: z.array(
    z.object({
      appId: z.number(),
      name: z.string(),
      headerImage: z.string().nullable(),
    }),
  ),
  commonGameList: z.array(
    z.object({
      appId: z.number(),
      name: z.string(),
      headerImage: z.string().nullable(),
    }),
  ),
  meta: z
    .object({
      friendLibraryCached: z.boolean(),
      friendLibraryTruncated: z.boolean(),
      gamesPerFriendLimit: z.number(),
    })
    .optional(),
});
export type FriendCompare = z.infer<typeof FriendCompareSchema>;

export const MultiplayerPlanSortSchema = z.enum([
  "popularity",
  "trending",
  "release",
  "review",
  "name",
]);
export type MultiplayerPlanSort = z.infer<typeof MultiplayerPlanSortSchema>;

export const MultiplayerPlanRequestSchema = z.object({
  friendSteamIds: z.array(z.string()).default([]),
  minPlayers: z.number().int().min(1).max(16).default(2),
  maxPlayers: z.number().int().min(1).max(16).default(8),
  minYear: z.number().int().min(1970).max(2100).default(2000),
  maxYear: z.number().int().min(1970).max(2100).default(new Date().getFullYear()),
  mode: z.enum(["local_coop", "online_coop", "pvp", "crossplay"]).optional(),
  genre: z.string().optional(),
  sortBy: MultiplayerPlanSortSchema.default("popularity"),
  suggested: z.boolean().optional().default(false),
  /** When true, only games owned by you and every selected friend. */
  strictLibraryMatching: z.boolean().optional().default(false),
  controller: z.boolean().optional(),
  steamDeck: z.boolean().optional(),
});
export type MultiplayerPlanRequest = z.infer<typeof MultiplayerPlanRequestSchema>;

export const MultiplayerPlanGameSchema = z.object({
  appId: z.number(),
  name: z.string(),
  headerImage: z.string().nullable(),
  genres: z.array(z.string()),
  categories: z.array(z.string()),
  deckStatus: z.string().nullable().optional(),
  yourPlaytimeMinutes: z.number().optional(),
  releaseYear: z.number().nullable(),
  reviewScore: z.number().nullable(),
  minPlayers: z.number().nullable(),
  maxPlayers: z.number().nullable(),
  /** Distinct party/lobby maxes for MAX:3/5/8 chips */
  playerMaxes: z.array(z.number()).nullable().optional(),
  playerCountSource: z.enum(["igdb", "steam_tag"]).nullable().optional(),
  isSuggested: z.boolean(),
  ownedByYou: z.boolean(),
  ownedByFriends: z.array(z.string()),
  missingFriends: z.array(z.string()),
  ownership: z.enum(["shared", "partial", "unowned"]),
});
export type MultiplayerPlanGame = z.infer<typeof MultiplayerPlanGameSchema>;

export const MultiplayerPlanResponseSchema = z.object({
  minPlayers: z.number(),
  maxPlayers: z.number(),
  minYear: z.number(),
  maxYear: z.number(),
  sortBy: MultiplayerPlanSortSchema,
  friendCount: z.number(),
  games: z.array(MultiplayerPlanGameSchema),
});
export type MultiplayerPlanResponse = z.infer<typeof MultiplayerPlanResponseSchema>;

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["auto", "custom"]),
  ruleKey: z.string().nullable(),
  gameCount: z.number(),
  description: z.string().nullable().optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const FamilyMemberSummarySchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  role: z.string().optional(),
  isMe: z.boolean().optional(),
  librarySize: z.number(),
  /** Games this member owns that at least one other family member also owns. */
  sharedCount: z.number().optional(),
  /** Games only this member owns in the group. */
  uniqueCount: z.number().optional(),
  /** Library value: recorded pricePaid when set, else current store price. */
  trackedSpend: z.number().optional(),
  /** Viewer's wishlist titles this member does not own. */
  wishlistGaps: z.number().optional(),
  playtimeHours: z.number().optional(),
  unusedCount: z.number().optional(),
});
export type FamilyMemberSummary = z.infer<typeof FamilyMemberSummarySchema>;

export const FamilyInsightsSchema = z.object({
  memberCount: z.number(),
  totalUniqueGames: z.number(),
  overlapCount: z.number(),
  duplicatePurchases: z.number(),
  familyValue: z.number(),
  currency: z.string().optional(),
  meSteamId: z.string().optional(),
  suggestedPurchaser: z
    .object({
      steamId: z.string(),
      personaName: z.string(),
      reason: z.string(),
    })
    .nullable(),
  members: z.array(FamilyMemberSummarySchema),
  conflicts: z.array(
    z.object({
      appId: z.number(),
      name: z.string(),
      owners: z.array(z.string()),
    }),
  ),
});
export type FamilyInsights = z.infer<typeof FamilyInsightsSchema>;

export const FamilyLibraryItemSchema = z.object({
  appId: z.number(),
  name: z.string(),
  headerImage: z.string().nullable(),
  ownerCount: z.number(),
  owners: z.array(
    z.object({
      steamId: z.string(),
      personaName: z.string(),
      avatarUrl: z.string().nullable(),
      isMe: z.boolean(),
    }),
  ),
  familyPlaytimeHours: z.number(),
  currentPrice: z.number().nullable(),
  lowestPrice: z.number().nullable(),
});
export type FamilyLibraryItem = z.infer<typeof FamilyLibraryItemSchema>;

export const FamilyLibrarySchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  meSteamId: z.string(),
  members: z.array(FamilyMemberSummarySchema),
  items: z.array(FamilyLibraryItemSchema),
});
export type FamilyLibrary = z.infer<typeof FamilyLibrarySchema>;

const GameOwnerSchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  playtimeForever: z.number(),
  playtimeHours: z.number(),
});

export const OnlinePlayersSchema = z.object({
  current: z.number().nullable(),
  peak24h: z.number().nullable(),
  peakAllTime: z.number().nullable(),
  history: z.array(
    z.object({
      date: z.string(),
      players: z.number(),
    }),
  ),
});
export type OnlinePlayers = z.infer<typeof OnlinePlayersSchema>;

export const GameDetailSchema = z.object({
  appId: z.number(),
  name: z.string(),
  headerImage: z.string().nullable(),
  genres: z.array(z.string()),
  categories: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  developers: z.array(z.string()).default([]),
  publishers: z.array(z.string()).default([]),
  deckStatus: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
  minPlayers: z.number().nullable(),
  maxPlayers: z.number().nullable(),
  playerMaxes: z.array(z.number()).nullable().optional(),
  playerCountSource: z.enum(["igdb", "steam_tag"]).nullable().optional(),
  onlinePlayers: OnlinePlayersSchema.nullable().optional(),
  youOwn: z.boolean(),
  yourPlaytimeHours: z.number().nullable(),
  friendOwners: z.array(GameOwnerSchema),
  price: z.object({
    current: z.number().nullable(),
    lowest: z.number().nullable(),
    historicalLow: z.number().nullable(),
    historicalHigh: z.number().nullable(),
    currency: z.string(),
    history: z.array(z.object({ date: z.string(), price: z.number() })),
  }),
  review: z
    .object({
      score: z.number().nullable(),
      description: z.string().nullable(),
      totalPositive: z.number(),
      totalNegative: z.number(),
      totalReviews: z.number(),
      storedScore: z.number().nullable(),
      histogram: z
        .array(
          z.object({
            date: z.number(),
            recommendationsUp: z.number(),
            recommendationsDown: z.number(),
          }),
        )
        .optional(),
    })
    .nullable(),
  hltb: z
    .object({
      mainHours: z.number().nullable(),
      extraHours: z.number().nullable(),
      completionistHours: z.number().nullable(),
      sourceUrl: z.string().nullable(),
    })
    .nullable(),
  news: z
    .array(
      z.object({
        gid: z.string(),
        title: z.string(),
        url: z.string(),
        contents: z.string(),
        date: z.number(),
        feedLabel: z.string(),
        author: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .optional(),
  achievements: z
    .object({
      unlocked: z.number().nullable(),
      total: z.number().nullable(),
      pct: z.number().nullable(),
      global: z.array(
        z.object({
          name: z.string(),
          displayName: z.string(),
          description: z.string(),
          percent: z.number(),
          icon: z.string().nullable(),
          unlocked: z.boolean().nullable(),
        }),
      ),
    })
    .nullable()
    .optional(),
  dlc: z
    .array(
      z.object({
        appId: z.number(),
        name: z.string(),
        headerImage: z.string().nullable(),
        finalPrice: z.number().nullable(),
        currency: z.string().nullable(),
        discountPercent: z.number(),
      }),
    )
    .optional(),
  packages: z
    .array(
      z.object({
        packageId: z.number(),
        name: z.string(),
        headerImage: z.string().nullable(),
        finalPrice: z.number().nullable(),
        currency: z.string().nullable(),
        discountPercent: z.number(),
        appCount: z.number(),
      }),
    )
    .optional(),
});
export type GameDetail = z.infer<typeof GameDetailSchema>;

export const FamilyGameDetailSchema = GameDetailSchema.extend({
  isFamilyShareable: z.boolean(),
  familyOwners: z.array(
    GameOwnerSchema.extend({
      isMe: z.boolean(),
      role: z.string(),
    }),
  ),
  playtime: z.object({
    familyTotalHours: z.number(),
    ownersWithPlaytime: z.number(),
  }),
});
export type FamilyGameDetail = z.infer<typeof FamilyGameDetailSchema>;

export const SearchResultSchema = z.object({
  games: z.array(
    z.object({
      appId: z.number(),
      name: z.string(),
      headerImage: z.string().nullable(),
      source: z.enum(["library", "wishlist", "catalog"]),
    }),
  ),
  friends: z.array(FriendSchema),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  collections: z.array(CollectionSchema),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SyncJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});
export type SyncJob = z.infer<typeof SyncJobSchema>;

export const PlayNextItemSchema = z.object({
  appId: z.number(),
  name: z.string(),
  headerImage: z.string().nullable(),
  playtimeForever: z.number(),
  lastPlayedAt: z.string().nullable(),
  score: z.number(),
  reasons: z.array(z.string()),
  deckStatus: z.string().nullable().optional(),
  genres: z.array(z.string()),
});
export type PlayNextItem = z.infer<typeof PlayNextItemSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof NotificationSchema>;

export const DealAlertSchema = z.object({
  store: StoreSchema.optional(),
  externalId: z.string().optional(),
  appId: z.number().nullable().optional(),
  name: z.string(),
  headerImage: z.string().nullable(),
  currentPrice: z.number().nullable(),
  lowestPrice: z.number().nullable(),
  targetPrice: z.number().nullable(),
  shouldBuyScore: z.number().nullable(),
  reason: z.enum(["target", "historical_low", "strong_score"]),
});
export type DealAlert = z.infer<typeof DealAlertSchema>;

export const FriendsListResponseSchema = z.object({
  friends: z.array(FriendSchema),
  meta: z.object({
    totalFriends: z.number(),
    librariesCached: z.number(),
    libraryCacheLimit: z.number(),
    gamesPerFriendLimit: z.number(),
    truncated: z.boolean(),
    lastSyncedAt: z.string().nullable(),
  }),
});
export type FriendsListResponse = z.infer<typeof FriendsListResponseSchema>;

export const TrendingFriendSampleSchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
});
export type TrendingFriendSample = z.infer<typeof TrendingFriendSampleSchema>;

export const TrendingGameSchema = z.object({
  appId: z.number(),
  name: z.string(),
  headerImage: z.string().nullable(),
  /** Friends shelf: how many sampled friends played this in the last 2 weeks. */
  friendCount: z.number().optional(),
  /** Friends shelf: sum of playtime_2weeks across friends (minutes). */
  totalPlaytimeMinutes: z.number().optional(),
  sampleFriends: z.array(TrendingFriendSampleSchema).optional(),
  /** Global shelf: Steam Charts rank (1-based). */
  rank: z.number().optional(),
  peakPlayers: z.number().optional(),
  /** Live concurrent players (concurrent shelf). */
  concurrentPlayers: z.number().optional(),
  /** Positive = rose vs last week / prior period. */
  rankChange: z.number().nullable().optional(),
});
export type TrendingGame = z.infer<typeof TrendingGameSchema>;

const TrendingShelfMetaSchema = z.object({
  rollupDate: z.string().nullable().optional(),
  lastUpdate: z.string().nullable().optional(),
  pageName: z.string().nullable().optional(),
  period: z.number().nullable().optional(),
  source: z.string(),
});

export const TrendingShelfSchema = z.object({
  games: z.array(TrendingGameSchema),
  meta: TrendingShelfMetaSchema,
});
export type TrendingShelf = z.infer<typeof TrendingShelfSchema>;

export const TrendingResponseSchema = z.object({
  friends: z.object({
    games: z.array(TrendingGameSchema),
    meta: z.object({
      friendsTotal: z.number(),
      friendsSampled: z.number(),
      friendsWithData: z.number(),
      friendsFailed: z.number(),
      cached: z.boolean(),
      truncated: z.boolean(),
      windowDays: z.number(),
    }),
  }),
  global: z.object({
    games: z.array(TrendingGameSchema),
    meta: z.object({
      rollupDate: z.string().nullable(),
      source: z.literal("steam_charts"),
    }),
  }),
  concurrent: TrendingShelfSchema.optional(),
  deck: TrendingShelfSchema.optional(),
  topReleases: TrendingShelfSchema.optional(),
});
export type TrendingResponse = z.infer<typeof TrendingResponseSchema>;

/** Poster/sidebar label: party/lobby MAX:5 or MAX:3/5/8 */
export function formatPlayerMaxLabel(
  maxes: number[] | null | undefined,
): string | null {
  if (!maxes?.length) return null;
  const cleaned = [...new Set(maxes)]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!cleaned.length) return null;
  return `MAX:${cleaned.join("/")}`;
}

/* ─── Music service DTOs ─── */

export const MusicHealthSchema = z.object({
  ok: z.boolean(),
  service: z.literal("questorylabs-music"),
  mode: z.string().optional(),
  database: z
    .object({
      provider: z.string(),
      urlConfigured: z.boolean(),
    })
    .optional(),
  ingestConfigured: z.boolean().optional(),
});
export type MusicHealth = z.infer<typeof MusicHealthSchema>;

export const MusicRangeSchema = z.enum(["day", "week", "month", "year", "all"]);
export type MusicRange = z.infer<typeof MusicRangeSchema>;

export const MusicOverviewSchema = z.object({
  username: z.string(),
  totalListens: z.number(),
  uniqueTracks: z.number(),
  uniqueArtists: z.number(),
  latestListenAt: z.string().nullable(),
  earliestListenAt: z.string().nullable(),
  streakDays: z.number(),
});
export type MusicOverview = z.infer<typeof MusicOverviewSchema>;

export const MusicTopItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  artistName: z.string().optional(),
  releaseTitle: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  slug: z.string().optional(),
  count: z.number(),
});
export type MusicTopItem = z.infer<typeof MusicTopItemSchema>;

export const MusicTimeBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
});
export type MusicTimeBucket = z.infer<typeof MusicTimeBucketSchema>;

export const MusicRecentListenSchema = z.object({
  id: z.string(),
  listenedAt: z.string(),
  track: z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    releaseTitle: z.string().nullable(),
    imageUrl: z.string().nullable(),
    genres: z.array(z.string()),
  }),
  mediaPlayer: z.string().nullable().optional(),
  submissionClient: z.string().nullable().optional(),
});
export type MusicRecentListen = z.infer<typeof MusicRecentListenSchema>;

/* ─── Watch service DTOs ─── */

export const WatchHealthSchema = z.object({
  ok: z.boolean(),
  service: z.literal("questorylabs-watch"),
  mode: z.string().optional(),
  database: z
    .object({
      provider: z.string(),
      urlConfigured: z.boolean(),
    })
    .optional(),
  traktConfigured: z.boolean().optional(),
  tmdbConfigured: z.boolean().optional(),
});
export type WatchHealth = z.infer<typeof WatchHealthSchema>;

export const WatchRangeSchema = z.enum(["day", "week", "month", "year", "all"]);
export type WatchRange = z.infer<typeof WatchRangeSchema>;

export const WatchOverviewSchema = z.object({
  userId: z.string(),
  personaName: z.string(),
  totalWatches: z.number(),
  uniqueTitles: z.number(),
  totalMinutes: z.number(),
  latestWatchAt: z.string().nullable(),
  earliestWatchAt: z.string().nullable(),
  streakDays: z.number(),
});
export type WatchOverview = z.infer<typeof WatchOverviewSchema>;

export const WatchTopItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  posterUrl: z.string().nullable().optional(),
  count: z.number(),
});
export type WatchTopItem = z.infer<typeof WatchTopItemSchema>;

export const WatchTimeBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
});
export type WatchTimeBucket = z.infer<typeof WatchTimeBucketSchema>;

export const WatchRecentEventSchema = z.object({
  id: z.string(),
  watchedAt: z.string(),
  source: z.string(),
  precision: z.string(),
  title: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    posterUrl: z.string().nullable(),
    genres: z.array(z.string()),
  }),
  episode: z
    .object({
      id: z.string(),
      seasonNumber: z.number(),
      episodeNumber: z.number(),
      name: z.string().nullable(),
    })
    .nullable(),
});
export type WatchRecentEvent = z.infer<typeof WatchRecentEventSchema>;

export { sanitizeAppHref } from "./safe-href";

export {
  parsePageParam,
  parsePageSizeParam,
  SteamId64Schema,
} from "./pagination";

// Server-only crypto helpers: import from `@questorylabs/shared/session`
// or `@questorylabs/shared/oauth-state` — never from this browser-safe barrel.

