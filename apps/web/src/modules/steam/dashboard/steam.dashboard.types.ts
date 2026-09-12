import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  DashboardStats,
  MusicInsights,
  MusicRecentPage,
  PlayNextItem,
  ReadInsights,
  ReadRecentPage,
  WatchInsights,
  WatchRecentPage,
} from "@questorylabs/shared";
import type { useSyncJobs } from "@/hooks/useSyncJobs";
import type { RecommendationResponse } from "@/lib/enterprise-types";

export type DashboardViewProps = {
  recentlyPlayed: DashboardStats["recentlyPlayed"];
  nextUp: PlayNextItem[];
  stats: UseResourceResult<DashboardStats>;
  playNext: UseResourceResult<PlayNextItem[]>;
  sync: ReturnType<typeof useSyncJobs>;
  showMusic?: boolean;
  showWatch?: boolean;
  showRead?: boolean;
  showEnterprise?: boolean;
  musicInsights?: UseResourceResult<MusicInsights>;
  musicRecent?: UseResourceResult<MusicRecentPage>;
  watchInsights?: UseResourceResult<WatchInsights>;
  watchRecent?: UseResourceResult<WatchRecentPage>;
  readInsights?: UseResourceResult<ReadInsights>;
  readRecent?: UseResourceResult<ReadRecentPage>;
  recs?: UseResourceResult<RecommendationResponse>;
};
