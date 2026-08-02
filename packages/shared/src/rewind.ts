import { z } from "zod";

export const RewindPeriodQuerySchema = z.object({
  period: z.string().regex(/^\d{4}(-\d{2})?$/, "Period must be YYYY or YYYY-MM"),
  forceRedo: z.coerce.boolean().optional().default(false),
});

export type RewindPeriodQuery = z.infer<typeof RewindPeriodQuerySchema>;

export const RewindInsightResponseSchema = z.object({
  period: z.string(),
  content: z.string(),
  generatedAt: z.string().datetime(),
  cached: z.boolean(),
});

export type RewindInsightResponse = z.infer<typeof RewindInsightResponseSchema>;

/* ── Rewind Stats (DB-driven, no AI) ── */

export interface RewindTopItem {
  id: string;
  name: string;
  count: number;
  imageUrl?: string | null;
  /** Secondary label: artist name for tracks, type for watch titles, format for read titles */
  subtitle?: string | null;
}

export interface RewindTopGenre {
  id: string;
  name: string;
  count: number;
}

export interface RewindPeakBucket {
  index: number;
  label: string;
  count: number;
}

export interface RewindMusicStats {
  domain: "music";
  period: string;
  totalPlays: number;
  listeningMinutes: number;
  uniqueTracks: number;
  uniqueArtists: number;
  newTracks: number;
  newArtists: number;
  topArtists: RewindTopItem[];
  topTracks: RewindTopItem[];
  topGenres: RewindTopGenre[];
  peakHour: RewindPeakBucket | null;
  peakDow: RewindPeakBucket | null;
}

export interface RewindWatchStats {
  domain: "watch";
  period: string;
  totalWatches: number;
  watchingMinutes: number;
  uniqueTitles: number;
  uniqueMovies: number;
  uniqueShows: number;
  movieWatches: number;
  showWatches: number;
  topTitles: RewindTopItem[];
  topGenres: RewindTopGenre[];
  peakHour: RewindPeakBucket | null;
  peakDow: RewindPeakBucket | null;
}

export interface RewindReadStats {
  domain: "read";
  period: string;
  totalEvents: number;
  chaptersLogged: number;
  uniqueTitles: number;
  topTitles: RewindTopItem[];
  topGenres: RewindTopGenre[];
  formatBreakdown: { name: string; count: number }[];
  peakHour: RewindPeakBucket | null;
  peakDow: RewindPeakBucket | null;
}

export type RewindStatsResponse =
  | RewindMusicStats
  | RewindWatchStats
  | RewindReadStats;
