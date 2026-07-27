"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { watchFetch } from "@/lib/watch";

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
  trakt: {
    connected: boolean;
    syncing: boolean;
    lastSyncedAt: string | null;
  };
  anilist: {
    connected: boolean;
    syncing: boolean;
    lastSyncedAt: string | null;
  };
};

/** Polls Watch sync/import activity for the shell status bar. */
export function useWatchSyncStatus(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const qc = useQueryClient();
  const wasActive = useRef(false);

  const query = useQuery({
    queryKey: ["watch-sync-status"],
    queryFn: () => watchFetch<WatchSyncStatus>("/sync-status"),
    enabled,
    staleTime: 1_000,
    // Heartbeat while idle so Trakt/AniList/Letterboxd activity appears in the shell bar.
    refetchInterval: (q) => (q.state.data?.active ? 2_000 : 5_000),
  });

  const active = Boolean(query.data?.active);

  useEffect(() => {
    if (!enabled) return;
    if (wasActive.current && !active) {
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
      void qc.invalidateQueries({ queryKey: ["watch-recent"] });
      void qc.invalidateQueries({ queryKey: ["trakt-status"] });
      void qc.invalidateQueries({ queryKey: ["anilist-status"] });
    }
    wasActive.current = active;
  }, [active, enabled, qc]);

  return {
    ...query,
    status: query.data ?? null,
    active,
    letterboxd: query.data?.letterboxd ?? null,
    traktSyncing: Boolean(query.data?.trakt.syncing),
    anilistSyncing: Boolean(query.data?.anilist.syncing),
  };
}
