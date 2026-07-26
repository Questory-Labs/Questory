"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

const JOBS = [
  "daily-refresh",
  "recover-failed-sync",
  "catalog-sync",
  "trakt-sync",
  "anilist-sync",
] as const;

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

export default function AdminCronPage() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["admin-cron-status"],
    queryFn: () => api<CronStatus>("/admin/cron/status"),
    refetchInterval: 10_000,
  });
  const runs = useQuery({
    queryKey: ["admin-cron-runs"],
    queryFn: () => api<{ runs: CronRun[] }>("/admin/cron/runs"),
    refetchInterval: 10_000,
  });

  const trigger = useMutation({
    mutationFn: (jobName: string) =>
      api("/admin/cron/trigger", {
        method: "POST",
        body: JSON.stringify({ jobName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cron-runs"] });
      qc.invalidateQueries({ queryKey: ["admin-cron-status"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
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
              {status.data?.enabled ? "enabled" : "disabled"}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            HTTP cron secret:{" "}
            {status.data?.secretConfigured ? "configured" : "not set"}
          </span>
        </div>
        {status.isLoading ? (
          <p className="text-[var(--muted)]">Loading scheduler status…</p>
        ) : null}
        {status.isError ? (
          <p className="text-[var(--warm)]">
            {(status.error as Error).message}
          </p>
        ) : null}
        <div className="space-y-2">
          {(status.data?.jobs || []).map((job) => (
            <div
              key={job.name}
              className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--line)] pt-2 first:border-t-0 first:pt-0"
            >
              <div>
                <span className="font-medium">{job.name}</span>
                <span className="text-[var(--muted)]">
                  {" "}
                  · {job.registered ? "registered" : "not registered"}
                  {job.running ? " · running" : ""}
                </span>
                {job.schedule ? (
                  <span className="ml-2 font-mono text-[10px] text-[var(--faint)]">
                    {job.schedule}
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] text-[var(--faint)]">
                    trigger-only
                  </span>
                )}
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

      <Panel className="mb-6 flex flex-wrap gap-2 p-4">
        {JOBS.map((job) => (
          <Button
            key={job}
            variant="secondary"
            disabled={trigger.isPending}
            onClick={() => trigger.mutate(job)}
          >
            Run {job}
          </Button>
        ))}
      </Panel>

      {trigger.isError ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}

      <div className="space-y-2">
        {(runs.data?.runs || []).map((r) => (
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
        {!runs.data?.runs?.length ? (
          <p className="text-sm text-[var(--muted)]">No cron runs recorded.</p>
        ) : null}
      </div>
    </>
  );
}
