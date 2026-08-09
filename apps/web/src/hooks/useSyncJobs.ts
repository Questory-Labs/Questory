"use client";

import { useEffect, useMemo, useRef } from "react";
import { useResource, useStore } from "@questorylabs/qhttp/react";
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
  const store = useStore();
  const wasActive = useRef(false);

  const query = useResource({
    id: ["sync-jobs"],
    load: () => api<{ jobs: SyncJob[] }>("/sync/jobs"),
    when: enabled,
    retries: false,
    freshFor: 1_000,
    refreshEvery: (value) => {
      const jobs = value?.jobs ?? [];
      return jobs.some((j) => isActiveStatus(j.status)) ? 2_000 : false;
    },
  });

  const stages: SyncStage[] = useMemo(() => {
    const byType = latestByType(query.value?.jobs ?? []);
    return SYNC_STAGES.map((stage) => ({
      ...stage,
      job: byType.get(stage.type) ?? null,
    }));
  }, [query.value?.jobs]);

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
      void store.touch(["dashboard"]);
      void store.touch(["library"]);
      void store.touch(["wishlist"]);
      void store.touch(["friends"]);
      void store.touch(["play-next"]);
      void store.touch(["me"]);
      void store.touch(["stores"]);
    }
    wasActive.current = active;
  }, [active, enabled, store]);

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
