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

export default function AdminCronPage() {
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Cron"
        description="Trigger scheduled jobs and inspect recent run history."
      />

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
