"use client";

import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUser } from "@/hooks/useUser";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { api } from "@/lib/api";
import {
  DASHBOARD_INSIGHTS_RANGE,
  DASHBOARD_PLAY_NEXT_LIMIT,
  DASHBOARD_RECS_LIMIT,
  DASHBOARD_SNIPPET_SIZE,
} from "@/lib/dashboard";
import { withTz } from "@/lib/dates";
import { fetchRecommendations } from "@/lib/enterprise-api";
import { musicFetch } from "@/lib/music";
import { readFetch } from "@/lib/read";
import { watchFetch } from "@/lib/watch";
import { useResource, type UseResourceResult } from "@questorylabs/qhttp/react";
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
import { cloneElements } from "@questorylabs/ui";
import { type PropsWithChildren } from "react";

export const DashboardController = ({ children }: PropsWithChildren) => {
  const { user } = useUser();
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const { enabled: showEnterpriseNav } = useEnterpriseEnabled();

  const stats = useResource({
    id: ["dashboard"],
    load: () => api<DashboardStats>("/dashboard/stats"),
  });

  const playNext = useResource({
    id: ["play-next"],
    load: () =>
      api<PlayNextItem[]>(
        `/dashboard/play-next?limit=${DASHBOARD_PLAY_NEXT_LIMIT}`,
      ),
  });

  const musicInsights = useResource({
    id: ["dashboard-music-insights"],
    load: () =>
      musicFetch<MusicInsights>(
        withTz(`/analytics/insights?range=${DASHBOARD_INSIGHTS_RANGE}`),
      ),
    when: showMusicNav,
  });
  const musicRecent = useResource({
    id: ["dashboard-music-recent"],
    load: () =>
      musicFetch<MusicRecentPage>(
        `/analytics/recent?page=1&pageSize=${DASHBOARD_SNIPPET_SIZE}`,
      ),
    when: showMusicNav,
  });

  const watchInsights = useResource({
    id: ["dashboard-watch-insights"],
    load: () =>
      watchFetch<WatchInsights>(
        withTz(`/analytics/insights?range=${DASHBOARD_INSIGHTS_RANGE}`),
      ),
    when: showWatchNav,
  });
  const watchRecent = useResource({
    id: ["dashboard-watch-recent"],
    load: () =>
      watchFetch<WatchRecentPage>(
        `/analytics/recent?page=1&pageSize=${DASHBOARD_SNIPPET_SIZE}`,
      ),
    when: showWatchNav,
  });

  const readInsights = useResource({
    id: ["dashboard-read-insights"],
    load: () =>
      readFetch<ReadInsights>(
        withTz(`/analytics/insights?range=${DASHBOARD_INSIGHTS_RANGE}`),
      ),
    when: showReadNav,
  });
  const readRecent = useResource({
    id: ["dashboard-read-recent"],
    load: () =>
      readFetch<ReadRecentPage>(
        `/analytics/recent?page=1&pageSize=${DASHBOARD_SNIPPET_SIZE}`,
      ),
    when: showReadNav,
  });

  const recs = useResource({
    id: ["dashboard-recommendations"],
    load: () => fetchRecommendations({ limit: DASHBOARD_RECS_LIMIT }),
    when: showEnterpriseNav,
    freshFor: 60_000,
    retries: 1,
  });

  const steamConnected = Boolean(user?.steamId);
  const sync = useSyncJobs({ enabled: steamConnected });

  const { value } = (stats as UseResourceResult<DashboardStats>) ?? {};
  const { recentlyPlayed } = value ?? {};
  const { value: nextUpValue } =
    (playNext as UseResourceResult<PlayNextItem[]>) ?? {};
  const nextUp = Array.isArray(nextUpValue) ? nextUpValue : [];

  return cloneElements(children, {
    recentlyPlayed,
    nextUp,
    stats,
    playNext,
    sync,
    showMusic: showMusicNav,
    showWatch: showWatchNav,
    showRead: showReadNav,
    showEnterprise: showEnterpriseNav,
    musicInsights,
    musicRecent,
    watchInsights,
    watchRecent,
    readInsights,
    readRecent,
    recs,
  });
};
