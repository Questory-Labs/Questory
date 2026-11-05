"use client";

import { useEffect, useMemo, useRef } from "react";
import { useResource, useStore, type ResourceStore } from "@questorylabs/qhttp/react";
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

const STEAM_SYNC_RESOURCES = [
  ["dashboard"],
  ["library"],
  ["wishlist"],
  ["friends"],
  ["play-next"],
  ["me"],
  ["stores"],
  ["sync-jobs"],
];
const STEAM_INVALIDATION_WINDOW_MS = 5_000;

type SteamInvalidationState = {
  last: number;
  sameTurn: boolean;
  trailing: ReturnType<typeof setTimeout> | null;
};

const steamInvalidations = new WeakMap<ResourceStore, SteamInvalidationState>();

function touchSteamSyncResources(
  store: ResourceStore,
  state: SteamInvalidationState,
) {
  state.last = Date.now();
  state.sameTurn = true;
  queueMicrotask(() => {
    state.sameTurn = false;
  });
  store.touch(STEAM_SYNC_RESOURCES);
}

export function invalidateSteamSyncResources(store: ResourceStore) {
  let state = steamInvalidations.get(store);
  if (!state) {
    state = { last: 0, sameTurn: false, trailing: null };
    steamInvalidations.set(store, state);
  }
  if (state.sameTurn || state.trailing !== null) return;

  const elapsed = Date.now() - state.last;
  if (elapsed >= STEAM_INVALIDATION_WINDOW_MS) {
    touchSteamSyncResources(store, state);
    return;
  }

  const pending = state;
  pending.trailing = setTimeout(() => {
    pending.trailing = null;
    touchSteamSyncResources(store, pending);
  }, STEAM_INVALIDATION_WINDOW_MS - elapsed);
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
      return jobs.some((j) => isActiveStatus(j.status)) ? 5_000 : false;
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
      invalidateSteamSyncResources(store);
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
