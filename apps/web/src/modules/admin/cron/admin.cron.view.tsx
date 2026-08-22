"use client";

import { Button, PageHeader, Panel } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { TRIGGERABLE_JOBS } from "./admin.cron.constants";
import type { AdminCronViewProps } from "./admin.cron.types";

export const AdminCronView = (props: Record<string, unknown>) => {
  const { page, setPage, status, runs, trigger } = props as AdminCronViewProps;

  const totalPages = runs.value
    ? Math.max(1, Math.ceil(runs.value.total / runs.value.pageSize))
    : 1;

  return (
    <>
      <PageHeader
        title="Cron"
        description="Scheduler status, manual triggers, and recent run history."
      />

      <Panel className="mb-6 space-y-3 p-4 text-sm">
        <ResourceStatus
          failed={status.failed}
          empty={status.empty}
          loading={<SkeletonListRows count={4} />}
          error={
            <p className="text-[var(--warm)]">
              {(status.error as Error)?.message}
            </p>
          }
        >
          <>
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
          </>
        </ResourceStatus>
      </Panel>

      {trigger.failed ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}

      <ResourceStatus
        failed={runs.failed}
        empty={runs.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--warm)]">
            {(runs.error as Error)?.message}
          </p>
        }
      >
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
      </ResourceStatus>

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
};
