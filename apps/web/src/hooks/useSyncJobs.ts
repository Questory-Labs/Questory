"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SyncJob } from "@questorylabs/shared";

export const SYNC_STAGES = [
  {
    type: "library-sync",
    label: "Library",
    detail: "Your games, friends, and playtime",
  },
  {
    type: "wishlist-sync",
    label: "Wishlist",
    detail: "Saved titles and deal signals",
  },
  {
    type: "metadata-refresh",
    label: "Prices",
    detail: "Store prices and game details",
  },
] as const;

export type SyncStageType = (typeof SYNC_STAGES)[number]["type"];

export type SyncStage = (typeof SYNC_STAGES)[number] & {
  job: SyncJob | null;
};

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

/** Polls `/sync/jobs` and exposes a per-type checklist while Steam sync runs. */
export function useSyncJobs(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const qc = useQueryClient();
  const wasActive = useRef(false);

  const query = useQuery({
    queryKey: ["sync-jobs"],
    queryFn: () => api<{ jobs: SyncJob[] }>("/sync/jobs"),
    enabled,
    staleTime: 1_000,
    refetchInterval: (q) => {
      const jobs = q.state.data?.jobs ?? [];
      return jobs.some((j) => isActiveStatus(j.status)) ? 2_000 : false;
    },
  });

  const stages: SyncStage[] = useMemo(() => {
    const byType = latestByType(query.data?.jobs ?? []);
    return SYNC_STAGES.map((stage) => ({
      ...stage,
      job: byType.get(stage.type) ?? null,
    }));
  }, [query.data?.jobs]);

  const active = stages.some((s) => isActiveStatus(s.job?.status));
  const failed = stages.filter((s) => s.job?.status === "failed");
  const doneCount = stages.filter((s) => s.job?.status === "completed").length;
  const running = stages.find((s) => s.job?.status === "running") ?? null;
  const pending = stages.find((s) => s.job?.status === "pending") ?? null;
  const current = running ?? pending;
  const hasJobs = stages.some((s) => s.job != null);
  const allDone = hasJobs && !active && failed.length === 0 && doneCount === stages.length;

  useEffect(() => {
    if (!enabled) return;
    if (wasActive.current && !active) {
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
      void qc.invalidateQueries({ queryKey: ["friends"] });
      void qc.invalidateQueries({ queryKey: ["play-next"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["stores"] });
    }
    wasActive.current = active;
  }, [active, enabled, qc]);

  return {
    ...query,
    stages,
    active,
    failed,
    doneCount,
    total: stages.length,
    current,
    hasJobs,
    allDone,
  };
}
