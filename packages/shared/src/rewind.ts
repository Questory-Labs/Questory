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

export interface RewindMonthBucket {
  /** `YYYY-MM` for yearly periods, `YYYY-MM-DD` for monthly ones. */
  month: string;
  count: number;
  topItem?: string | null;
}

export interface RewindBusiestDay {
  date: string;
  count: number;
}

export interface RewindPriorComparison {
  total: number;
  deltaPct: number | null;
  newItems: number;
  returningItems: number;
  /** False when history starts after the prior period began (comparison is biased). */
  coverage: boolean;
}

export interface RewindCommonExtras {
  activeDays?: number;
  longestStreakDays?: number;
  longestGapDays?: number;
  busiestDay?: RewindBusiestDay | null;
  monthly?: RewindMonthBucket[];
  prior?: RewindPriorComparison;
  droppedOff?: RewindTopItem[];
}

export interface RewindMusicStats extends RewindCommonExtras {
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
  topMoods?: RewindTopGenre[];
  featuredArtists?: RewindTopItem[];
  maxRepeatsInDay?: { name: string; subtitle?: string | null; count: number; date: string } | null;
}

export interface RewindWatchStats extends RewindCommonExtras {
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
  avgRating?: number | null;
  ratedCount?: number;
  topRated?: RewindTopItem[];
  unfinished?: RewindTopItem[];
  bingeRuns?: RewindTopItem[];
}

export interface RewindReadStats extends RewindCommonExtras {
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
  statusBreakdown?: { completed: number; dropped: number; repeating: number };
  volumesRead?: number;
}

export interface RewindGamesStats extends RewindCommonExtras {
  domain: "games";
  period: string;
  totalMinutes: number;
  sessions: number;
  sessionsAvailable: boolean;
  uniqueGames: number;
  newGames: number;
  topGames: RewindTopItem[];
  topGenres: RewindTopGenre[];
  longestSession: { name: string; minutes: number; date: string } | null;
  lateNightShare: number | null;
  peakHour: RewindPeakBucket | null;
  peakDow: RewindPeakBucket | null;
  backlog: number | null;
  abandoned?: RewindTopItem[];
  achievementsInPeriod: number | null;
}

export interface RewindAllStats {
  domain: "all";
  period: string;
  domains: {
    music?: RewindMusicStats;
    watch?: RewindWatchStats;
    read?: RewindReadStats;
    games?: RewindGamesStats;
  };
}

export type RewindStatsResponse =
  | RewindMusicStats
  | RewindWatchStats
  | RewindReadStats
  | RewindGamesStats
  | RewindAllStats;

/* ── Rewind period rules ── */

const REWIND_PERIOD_RE = /^(\d{4})(?:-(\d{2}))?$/;

export function isRewindYearlyPeriod(period: string): boolean {
  return /^\d{4}$/.test(period);
}

/** The period of the same length immediately before `period`. */
export function previousRewindPeriod(period: string): string {
  const match = REWIND_PERIOD_RE.exec(period);
  if (!match) throw new Error("period must be YYYY or YYYY-MM");
  const year = Number.parseInt(match[1]!, 10);
  if (match[2] == null) return String(year - 1);
  const month = Number.parseInt(match[2], 10);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** Months with complete data for rewind (excludes the in-progress current month). */
export function completedRewindMonths(year: number, now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (m) => year < currentYear || m < currentMonth,
  );
}

/** Latest month selectable for rewind in the given year, or null if none yet. */
export function latestCompletedRewindMonth(year: number, now = new Date()): number | null {
  const months = completedRewindMonths(year, now);
  return months.length > 0 ? months[months.length - 1]! : null;
}

/** Default month picker value when the year changes. */
export function defaultRewindMonthForYear(year: number, now = new Date()): number | "all" {
  if (year < now.getFullYear()) return "all";
  return latestCompletedRewindMonth(year, now) ?? "all";
}

/** Whether AI rewind generation is allowed for this period. */
export function isRewindAiGenerationAllowed(period: string, now = new Date()): boolean {
  return getRewindAiPeriodError(period, now) === null;
}

/** Error message when AI rewind generation is blocked, or null if allowed. */
export function getRewindAiPeriodError(period: string, now = new Date()): string | null {
  if (!REWIND_PERIOD_RE.test(period)) {
    return "period must be YYYY or YYYY-MM";
  }
  if (isRewindYearlyPeriod(period)) {
    const year = Number.parseInt(period, 10);
    if (year === now.getFullYear()) {
      return "Yearly rewind is only available for completed years. Select a month for the current year.";
    }
  }
  return null;
}
