"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@questorylabs/qhttp/react";
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

  const store = useStore();
  const wasActive = useRef({
    steam: false,
    music: false,
    watch: false,
    read: false,
  });

  const query = useSseBackedQuery<ShellSyncStatus>({
    id: queryKey,
    load: () => api<ShellSyncStatus>(shellStatusPath(moduleOpts)),
    streamUrl,
    enabled,
  });

  const data = query.value;

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
      void store.touch(["dashboard"]);
      void store.touch(["library"]);
      void store.touch(["wishlist"]);
      void store.touch(["friends"]);
      void store.touch(["play-next"]);
      void store.touch(["me"]);
      void store.touch(["stores"]);
      void store.touch(["sync-jobs"]);
    }
    if (wasActive.current.music && !musicActive) {
      void store.touch(["music-overview"]);
      void store.touch(["music-listening"]);
      void store.touch(["music-charts"]);
    }
    if (wasActive.current.watch && !watchActive) {
      void store.touch(["watch-overview"]);
      void store.touch(["watch-recent"]);
      void store.touch(["trakt-status"]);
      void store.touch(["anilist-status"]);
    }
    if (wasActive.current.read && !readActive) {
      void store.touch(["read-overview"]);
      void store.touch(["read-recent"]);
      void store.touch(["read-library"]);
      void store.touch(["read-anilist-status"]);
      void store.touch(["read-mal-status"]);
      void store.touch(["read-kitsu-status"]);
      void store.touch(["read-bangumi-status"]);
      void store.touch(["read-shikimori-status"]);
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
    store,
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
