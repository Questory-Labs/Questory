import { z } from "zod";

const SearchFriendSchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  friendUserId: z.string().nullable().optional(),
  libraryCached: z.boolean().optional(),
});

const SearchCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["auto", "custom"]),
  ruleKey: z.string().nullable(),
  gameCount: z.number(),
  description: z.string().nullable().optional(),
});

export const SearchGameHitSchema = z.object({
  appId: z.number(),
  gameId: z.string().nullable().optional(),
  name: z.string(),
  headerImage: z.string().nullable(),
  source: z.enum(["library", "wishlist", "catalog"]),
});
export type SearchGameHit = z.infer<typeof SearchGameHitSchema>;

export const SearchMusicArtistHitSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type SearchMusicArtistHit = z.infer<typeof SearchMusicArtistHitSchema>;

export const SearchMusicAlbumHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  artistName: z.string().nullable().optional(),
});
export type SearchMusicAlbumHit = z.infer<typeof SearchMusicAlbumHitSchema>;

export const SearchMusicTrackHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  artistName: z.string().nullable().optional(),
  albumName: z.string().nullable().optional(),
});
export type SearchMusicTrackHit = z.infer<typeof SearchMusicTrackHitSchema>;

export const SearchWatchHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  lastWatchedAt: z.string().nullable().optional(),
});
export type SearchWatchHit = z.infer<typeof SearchWatchHitSchema>;

export const SearchReadHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string(),
  coverUrl: z.string().nullable().optional(),
  listStatus: z.string().nullable().optional(),
});
export type SearchReadHit = z.infer<typeof SearchReadHitSchema>;

export const SearchResultSchema = z.object({
  games: z.array(SearchGameHitSchema),
  friends: z.array(SearchFriendSchema),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  collections: z.array(SearchCollectionSchema),
  music: z.object({
    artists: z.array(SearchMusicArtistHitSchema),
    albums: z.array(SearchMusicAlbumHitSchema),
    tracks: z.array(SearchMusicTrackHitSchema),
  }),
  watch: z.object({
    movies: z.array(SearchWatchHitSchema),
    shows: z.array(SearchWatchHitSchema),
  }),
  read: z.object({
    titles: z.array(SearchReadHitSchema),
  }),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
