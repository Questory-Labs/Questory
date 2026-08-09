"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { ADMIN_CRON_PAGE_SIZE } from "@/lib/pagination";

const TRIGGERABLE_JOBS = new Set([
  "daily-refresh", // Steam user library sync (owned + friends)
  "recover-failed-sync",
  "watch-sync",
  "catalog-sync",
  "price-sync",
  "trakt-sync",
  "anilist-sync",
  "mal-sync",
  "kitsu-sync",
  "bangumi-sync",
  "shikimori-sync",
]);

type CronRun = {
  id: string;
  jobName: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};

type CronJobStatus = {
  name: string;
  schedule: string | null;
  registered: boolean;
  running: boolean;
  nextDate: string | null;
  lastRun: CronRun | null;
};

type CronStatus = {
  enabled: boolean;
  secretConfigured: boolean;
  jobs: CronJobStatus[];
};

type CronRunsResponse = {
  page: number;
  pageSize: number;
  total: number;
  runs: CronRun[];
};

export default function AdminCronPage() {
  const store = useStore();
  const [page, setPage] = useState(1);
  const status = useResource({
    id: ["admin-cron-status"],
    load: () => api<CronStatus>("/admin/cron/status"),
    refreshEvery: 10_000,
  });
  const runs = useResource({
    id: ["admin-cron-runs", page],
    load: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ADMIN_CRON_PAGE_SIZE),
      });
      return api<CronRunsResponse>(`/admin/cron/runs?${params}`);
    },
    refreshEvery: 10_000,
  });

  const totalPages = runs.value
    ? Math.max(1, Math.ceil(runs.value.total / runs.value.pageSize))
    : 1;

  const trigger = useAction({
    run: (jobName: string) =>
      api("/admin/cron/trigger", {
        method: "POST",
        body: JSON.stringify({ jobName }),
      }),
    onSuccess: () => {
      store.touch(["admin-cron-runs"]);
      store.touch(["admin-cron-status"]);
      store.touch(["admin-overview"]);
    },
  });

  return (
    <>
      <PageHeader
        title="Cron"
        description="Scheduler status, manual triggers, and recent run history."
      />

      <Panel className="mb-6 space-y-3 p-4 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            In-process:{" "}
            <span className="font-medium">
              {status.value?.enabled ? "enabled" : "disabled"}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            HTTP cron secret:{" "}
            {status.value?.secretConfigured ? "configured" : "not set"}
          </span>
        </div>
        {status.empty ? (
          <p className="text-[var(--muted)]">Loading scheduler status…</p>
        ) : null}
        {status.failed ? (
          <p className="text-[var(--warm)]">
            {(status.error as Error).message}
          </p>
        ) : null}
        <div className="space-y-2">
          {(status.value?.jobs || []).map((job) => (
            <div
              key={job.name}
              className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--line)] pt-2 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{job.name}</div>
                <div className="font-mono text-xs text-[var(--muted)]">
                  {job.registered ? "registered" : "not registered"}
                  {job.running ? " · running" : ""}
                  {job.schedule ? (
                    <span> · {job.schedule}</span>
                  ) : (
                    <span> · trigger-only</span>
                  )}
                </div>
                {TRIGGERABLE_JOBS.has(job.name) ? (
                  <div className="mt-2 font-mono text-xs">
                    <button
                      type="button"
                      className="cursor-pointer text-[var(--accent)] hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={trigger.busy}
                      onClick={() => trigger.submit(job.name)}
                    >
                      Run
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="text-right text-xs text-[var(--muted)]">
                {job.nextDate ? (
                  <div>next {new Date(job.nextDate).toLocaleString()}</div>
                ) : null}
                {job.lastRun ? (
                  <div>
                    last {job.lastRun.status} ·{" "}
                    {new Date(job.lastRun.startedAt).toLocaleString()}
                  </div>
                ) : (
                  <div>no runs yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {trigger.failed ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}

      <div className="space-y-2">
        {(runs.value?.runs || []).map((r) => (
          <Panel key={r.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                <span className="font-medium">{r.jobName}</span>{" "}
                <span className="text-[var(--muted)]">
                  · {r.status} · {r.triggeredBy}
                </span>
              </span>
              <span className="font-mono text-[10px] text-[var(--faint)]">
                {r.id.slice(0, 8)} · {new Date(r.startedAt).toLocaleString()}
              </span>
            </div>
            {r.error ? (
              <p className="mt-1 text-xs text-[var(--warm)]">{r.error}</p>
            ) : null}
          </Panel>
        ))}
        {!runs.value?.runs?.length ? (
          <p className="text-sm text-[var(--muted)]">No cron runs recorded.</p>
        ) : null}
      </div>

      {runs.value && runs.value.total > runs.value.pageSize ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
}
