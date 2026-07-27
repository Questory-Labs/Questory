"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readFetch } from "@/lib/read";

export type ReadSyncStatus = {
  active: boolean;
  anilist: {
    connected: boolean;
    syncing: boolean;
    lastSyncedAt: string | null;
  };
};

/** Polls Read AniList sync for the shell status bar. */
export function useReadSyncStatus(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const qc = useQueryClient();
  const wasActive = useRef(false);

  const query = useQuery({
    queryKey: ["read-sync-status"],
    queryFn: () => readFetch<ReadSyncStatus>("/sync-status"),
    enabled,
    staleTime: 1_000,
    refetchInterval: (q) => (q.state.data?.active ? 2_000 : 5_000),
  });

  const active = Boolean(query.data?.active);

  useEffect(() => {
    if (!enabled) return;
    if (wasActive.current && !active) {
      void qc.invalidateQueries({ queryKey: ["read-overview"] });
      void qc.invalidateQueries({ queryKey: ["read-recent"] });
      void qc.invalidateQueries({ queryKey: ["read-library"] });
      void qc.invalidateQueries({ queryKey: ["read-anilist-status"] });
    }
    wasActive.current = active;
  }, [active, enabled, qc]);

  return {
    ...query,
    status: query.data ?? null,
    active,
    anilistSyncing: Boolean(query.data?.anilist.syncing),
  };
}
