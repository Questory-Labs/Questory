import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { DashboardStats, PlayNextItem } from "@questorylabs/shared";
import type { useSyncJobs } from "@/hooks/useSyncJobs";

export type DashboardViewProps = {
  recentlyPlayed: DashboardStats["recentlyPlayed"];
  nextUp: PlayNextItem[];
  stats: UseResourceResult<DashboardStats>;
  playNext: UseResourceResult<PlayNextItem[]>;
  sync: ReturnType<typeof useSyncJobs>;
};
