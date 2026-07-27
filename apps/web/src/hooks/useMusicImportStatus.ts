"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { musicFetch } from "@/lib/music";

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

/** Polls active music import job for the shell status bar. */
export function useMusicImportStatus(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const qc = useQueryClient();
  const wasActive = useRef(false);

  const query = useQuery({
    queryKey: ["music-import-active"],
    queryFn: () => musicFetch<MusicImportJob | null>("/imports/active"),
    enabled,
    staleTime: 1_000,
    // Heartbeat while idle so a new import from Settings appears in the shell bar.
    refetchInterval: (q) =>
      q.state.data?.status === "running" ? 2_000 : 5_000,
  });

  const job = query.data ?? null;
  const active = job?.status === "running";

  useEffect(() => {
    if (!enabled) return;
    if (wasActive.current && !active) {
      void qc.invalidateQueries({ queryKey: ["music-overview"] });
      void qc.invalidateQueries({ queryKey: ["music-listening"] });
      void qc.invalidateQueries({ queryKey: ["music-charts"] });
    }
    wasActive.current = active;
  }, [active, enabled, qc]);

  return {
    ...query,
    job,
    active,
  };
}
