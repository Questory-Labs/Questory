"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@questorylabs/qhttp/react";
import { withApiVersion } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/runtime-env";
import { useSseBackedQuery } from "@/hooks/useSseBackedQuery";
import {
  SYNC_STAGES,
  type SyncStage,
  type SyncStageType,
} from "@/hooks/useSyncJobs";
import type { SyncJob } from "@questorylabs/shared";

export type MusicImportJob = {
  id: string;
  source: string;
  status: string;
  fileName?: string | null;
  total: number;
  accepted: number;
  skipped: number;
  processed: number;
  percent: number | null;
  phase: string;
  lastError?: string | null;
  completedAt?: string | null;
};

export type ProviderConnStatus = {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
};

export type WatchSyncStatus = {
  active: boolean;
  letterboxd: {
    id: string;
    source: string;
    status: string;
    fileName?: string | null;
    total: number;
    accepted: number;
    skipped: number;
    processed: number;
    percent: number | null;
    lastError?: string | null;
  } | null;
  trakt: ProviderConnStatus;
  anilist: ProviderConnStatus;
  mal: ProviderConnStatus;
  kitsu: ProviderConnStatus;
  bangumi: ProviderConnStatus;
  shikimori: ProviderConnStatus;
};

export type ReadSyncStatus = {
  active: boolean;
  anilist: ProviderConnStatus;
  mal: ProviderConnStatus;
  kitsu: ProviderConnStatus;
  bangumi: ProviderConnStatus;
  shikimori: ProviderConnStatus;
};

export type ShellSyncStatus = {
  steam: {
    active: boolean;
    jobs: SyncJob[];
  };
  music: {
    active: boolean;
    job: MusicImportJob | null;
  } | null;
  watch: WatchSyncStatus | null;
  read: ReadSyncStatus | null;
};

export const SHELL_SYNC_QUERY_KEY = ["shell-sync-status"] as const;

function latestByType(jobs: SyncJob[]): Map<string, SyncJob> {
  const map = new Map<string, SyncJob>();
  for (const job of jobs) {
    if (!map.has(job.type)) map.set(job.type, job);
  }
  return map;
}

function isActiveStatus(status: SyncJob["status"] | undefined) {
  return status === "pending" || status === "running";
}

function shellModulesQuery(opts: {
  steamEnabled: boolean;
  musicEnabled: boolean;
  watchEnabled: boolean;
  readEnabled: boolean;
}) {
  const params = new URLSearchParams();
  if (opts.steamEnabled) params.set("steam", "1");
  if (opts.musicEnabled) params.set("music", "1");
  if (opts.watchEnabled) params.set("watch", "1");
  if (opts.readEnabled) params.set("read", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function shellStreamUrl(opts: {
  steamEnabled: boolean;
  musicEnabled: boolean;
  watchEnabled: boolean;
  readEnabled: boolean;
}) {
  const path = withApiVersion("/shell/sync-status/stream", ["/health"]);
  return `${getApiUrl()}${path}${shellModulesQuery(opts)}`;
}

function shellStatusPath(opts: {
  steamEnabled: boolean;
  musicEnabled: boolean;
  watchEnabled: boolean;
  readEnabled: boolean;
}) {
  return `/shell/sync-status${shellModulesQuery(opts)}`;
}

/**
 * Single shell sync feed: SSE push with one-shot GET fallback.
 * Replaces separate music/watch/read/steam status polling in the status bar.
 */
export function useShellSyncStatus(opts?: {
  steamEnabled?: boolean;
  musicEnabled?: boolean;
  watchEnabled?: boolean;
  readEnabled?: boolean;
}) {
  const steamEnabled = opts?.steamEnabled ?? false;
  const musicEnabled = opts?.musicEnabled ?? false;
  const watchEnabled = opts?.watchEnabled ?? false;
  const readEnabled = opts?.readEnabled ?? false;
  const enabled =
    steamEnabled || musicEnabled || watchEnabled || readEnabled;

  const moduleOpts = useMemo(
    () => ({
      steamEnabled,
      musicEnabled,
      watchEnabled,
      readEnabled,
    }),
    [steamEnabled, musicEnabled, watchEnabled, readEnabled],
  );

  const streamUrl = useMemo(
    () => shellStreamUrl(moduleOpts),
    [moduleOpts],
  );

  const queryKey = useMemo(
    () => [...SHELL_SYNC_QUERY_KEY, moduleOpts] as const,
    [moduleOpts],
  );

  const qc = useQueryClient();
  const wasActive = useRef({
    steam: false,
    music: false,
    watch: false,
    read: false,
  });

  const query = useSseBackedQuery<ShellSyncStatus>({
    queryKey,
    queryFn: () => api<ShellSyncStatus>(shellStatusPath(moduleOpts)),
    streamUrl,
    enabled,
    pollInterval: (status) => {
      if (!status) return 30_000;
      const anyActive =
        status.steam.active ||
        Boolean(status.music?.active) ||
        Boolean(status.watch?.active) ||
        Boolean(status.read?.active);
      return anyActive ? 2_000 : 30_000;
    },
  });

  const data = query.data;

  const steamStages: SyncStage[] = useMemo(() => {
    const byType = latestByType(data?.steam.jobs ?? []);
    return SYNC_STAGES.map((stage) => ({
      ...stage,
      job: byType.get(stage.type as SyncStageType) ?? null,
    }));
  }, [data?.steam.jobs]);

  const steamActive = Boolean(data?.steam.active);
  const steamDoneCount = steamStages.filter(
    (s) => s.job?.status === "completed",
  ).length;
  const steamRunning =
    steamStages.find((s) => s.job?.status === "running") ?? null;
  const steamPending =
    steamStages.find((s) => s.job?.status === "pending") ?? null;
  const steamCurrent = steamRunning ?? steamPending;
  const steamHasJobs = steamStages.some((s) => s.job != null);

  const musicJob = data?.music?.job ?? null;
  const musicActive = Boolean(data?.music?.active);

  const watchStatus = data?.watch ?? null;
  const watchActive = Boolean(watchStatus?.active);
  const watchLetterboxd = watchStatus?.letterboxd ?? null;
  const watchTraktSyncing = Boolean(watchStatus?.trakt.syncing);
  const watchAnilistSyncing = Boolean(watchStatus?.anilist.syncing);
  const watchAnimeListSyncing = Boolean(
    watchStatus?.mal.syncing ||
      watchStatus?.kitsu.syncing ||
      watchStatus?.bangumi.syncing ||
      watchStatus?.shikimori.syncing,
  );

  const readStatus = data?.read ?? null;
  const readActive = Boolean(readStatus?.active);

  useEffect(() => {
    if (!enabled || !data) return;

    if (wasActive.current.steam && !steamActive) {
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
      void qc.invalidateQueries({ queryKey: ["friends"] });
      void qc.invalidateQueries({ queryKey: ["play-next"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["stores"] });
      void qc.invalidateQueries({ queryKey: ["sync-jobs"] });
    }
    if (wasActive.current.music && !musicActive) {
      void qc.invalidateQueries({ queryKey: ["music-overview"] });
      void qc.invalidateQueries({ queryKey: ["music-listening"] });
      void qc.invalidateQueries({ queryKey: ["music-charts"] });
    }
    if (wasActive.current.watch && !watchActive) {
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
      void qc.invalidateQueries({ queryKey: ["watch-recent"] });
      void qc.invalidateQueries({ queryKey: ["trakt-status"] });
      void qc.invalidateQueries({ queryKey: ["anilist-status"] });
    }
    if (wasActive.current.read && !readActive) {
      void qc.invalidateQueries({ queryKey: ["read-overview"] });
      void qc.invalidateQueries({ queryKey: ["read-recent"] });
      void qc.invalidateQueries({ queryKey: ["read-library"] });
      void qc.invalidateQueries({ queryKey: ["read-anilist-status"] });
      void qc.invalidateQueries({ queryKey: ["read-mal-status"] });
      void qc.invalidateQueries({ queryKey: ["read-kitsu-status"] });
      void qc.invalidateQueries({ queryKey: ["read-bangumi-status"] });
      void qc.invalidateQueries({ queryKey: ["read-shikimori-status"] });
    }

    wasActive.current = {
      steam: steamActive,
      music: musicActive,
      watch: watchActive,
      read: readActive,
    };
  }, [
    data,
    enabled,
    musicActive,
    qc,
    readActive,
    steamActive,
    watchActive,
  ]);

  return {
    ...query,
    steam: {
      active: steamActive,
      stages: steamStages,
      doneCount: steamDoneCount,
      total: steamStages.length,
      current: steamCurrent,
      hasJobs: steamHasJobs,
    },
    music: {
      active: musicActive,
      job: musicJob,
    },
    watch: {
      active: watchActive,
      status: watchStatus,
      letterboxd: watchLetterboxd,
      traktSyncing: watchTraktSyncing,
      anilistSyncing: watchAnilistSyncing,
      animeListSyncing: watchAnimeListSyncing,
    },
    read: {
      active: readActive,
      status: readStatus,
      anilistSyncing: Boolean(readStatus?.anilist.syncing),
      animeListSyncing: Boolean(
        readStatus?.mal.syncing ||
          readStatus?.kitsu.syncing ||
          readStatus?.bangumi.syncing ||
          readStatus?.shikimori.syncing,
      ),
    },
  };
}

export { isActiveStatus };
