"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { durationLabel, relativeTime } from "../jobs/admin.jobs.utils";
import {
  ADMIN_MONO_DIM,
  ADMIN_ROW,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE,
  ADMIN_TABLE_WRAP,
  ADMIN_TD,
  ADMIN_TH,
} from "../shared/admin.styles";
import { statusTone } from "../shared/admin.tone";
import {
  AdminStatusDot,
  AdminStatusPill,
} from "../shared/components/AdminStatusPill";
import { TRIGGERABLE_JOBS } from "./admin.cron.constants";
import type { AdminCronViewProps, CronJobStatus } from "./admin.cron.types";

const StatusChip = ({
  on,
  live = false,
  children,
}: {
  on: boolean;
  live?: boolean;
  children: ReactNode;
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] ${
      on
        ? "border-[var(--ok)]/25 bg-[var(--ok)]/[0.06] text-[var(--ink)]"
        : "border-[var(--line)] bg-white/[0.03] text-[var(--muted)]"
    }`}
  >
    <AdminStatusDot tone={on ? "ok" : "muted"} live={on && live} />
    {children}
  </span>
);

const LastRunCell = ({ job, now }: { job: CronJobStatus; now: number }) => {
  if (job.running) {
    return (
      <span className="inline-flex items-center gap-2">
        <AdminStatusDot tone="warm" live />
        <span className="font-mono text-xs text-[var(--ink)]">Running</span>
      </span>
    );
  }
  const run = job.lastRun;
  if (!run) return <span className={ADMIN_MONO_DIM}>Never</span>;
  const tone = statusTone(run.status);
  const failed = tone === "danger";
  const when = relativeTime(run.startedAt, now);
  const duration = durationLabel(run.startedAt, run.finishedAt);
  const text = failed
    ? `Failed ${when}`
    : duration
      ? `${when} · ${duration}`
      : when;
  return (
    <span className="inline-flex items-center gap-2">
      <AdminStatusDot tone={tone} live={failed} />
      <span
        className={`font-mono text-xs ${
          failed ? "text-[var(--danger)]" : "text-[var(--muted)]"
        }`}
      >
        {text}
      </span>
    </span>
  );
};

export const AdminCronView = (props: Record<string, unknown>) => {
  const { page, setPage, status, runs, trigger } = props as AdminCronViewProps;
  const now = Date.now();

  const totalPages = runs.value
    ? Math.max(1, Math.ceil(runs.value.total / runs.value.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-3.5">
      <ResourceStatus
        failed={status.failed}
        empty={status.empty}
        loading={<SkeletonListRows count={4} />}
        error={
          <p className="text-sm text-[var(--danger)]">
            {(status.error as Error)?.message}
          </p>
        }
      >
        <>
          <div
            className="q-in flex flex-wrap gap-2"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <StatusChip on={Boolean(status.value?.enabled)} live>
              In-process scheduler {status.value?.enabled ? "on" : "off"}
            </StatusChip>
            <StatusChip on={Boolean(status.value?.secretConfigured)}>
              HTTP cron secret{" "}
              {status.value?.secretConfigured ? "set" : "unset"}
            </StatusChip>
          </div>

          <div
            className={ADMIN_TABLE_WRAP}
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <table className={`${ADMIN_TABLE} min-w-[820px]`}>
              <thead>
                <tr>
                  <th scope="col" className={ADMIN_TH}>
                    Job
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Schedule
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Last run
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Next run
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    <span className="sr-only">Run</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(status.value?.jobs || []).map((job) => (
                  <tr key={job.name} className={ADMIN_ROW}>
                    <td className={`${ADMIN_TD} font-mono text-[13px]`}>
                      {job.name}
                      {!job.registered ? (
                        <span className="ml-2 text-[11px] text-[var(--faint)]">
                          not registered
                        </span>
                      ) : null}
                    </td>
                    <td className={`${ADMIN_TD} text-[var(--muted)]`}>
                      {job.schedule ?? "Trigger only"}
                    </td>
                    <td className={ADMIN_TD}>
                      <LastRunCell job={job} now={now} />
                    </td>
                    <td className={`${ADMIN_TD} ${ADMIN_MONO_DIM}`}>
                      {job.nextDate ? relativeTime(job.nextDate, now) : "—"}
                    </td>
                    <td className="px-3.5 py-1.5 text-right">
                      {TRIGGERABLE_JOBS.has(job.name) ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Run ${job.name} now`}
                          disabled={trigger.busy}
                          onClick={() => trigger.submit(job.name)}
                        >
                          Run now
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      </ResourceStatus>

      {trigger.failed ? (
        <p className="text-sm text-[var(--danger)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}

      <h2 className={`${ADMIN_SECTION_TITLE} mt-4 px-1`}>Run history</h2>

      <ResourceStatus
        failed={runs.failed}
        empty={runs.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--danger)]">
            {(runs.error as Error)?.message}
          </p>
        }
      >
        {runs.value?.runs?.length ? (
          <div
            className={ADMIN_TABLE_WRAP}
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <table className={`${ADMIN_TABLE} min-w-[720px]`}>
              <thead>
                <tr>
                  <th scope="col" className={ADMIN_TH}>
                    Job
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Status
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Trigger
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Started
                  </th>
                  <th scope="col" className={ADMIN_TH}>
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.value.runs.map((r) => (
                  <tr key={r.id} className={`${ADMIN_ROW} align-top`}>
                    <td className={ADMIN_TD}>
                      <div className="font-mono text-[13px]">{r.jobName}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                        {r.id.slice(0, 8)}
                      </div>
                      {r.error ? (
                        <p className="mt-1 max-w-md font-mono text-xs text-[var(--danger)]">
                          {r.error}
                        </p>
                      ) : null}
                    </td>
                    <td className={ADMIN_TD}>
                      <AdminStatusPill
                        tone={statusTone(r.status)}
                        live={r.status === "running"}
                      >
                        {r.status}
                      </AdminStatusPill>
                    </td>
                    <td className={`${ADMIN_TD} text-[var(--muted)]`}>
                      {r.triggeredBy}
                    </td>
                    <td
                      className={`${ADMIN_TD} ${ADMIN_MONO_DIM}`}
                      title={new Date(r.startedAt).toLocaleString()}
                    >
                      {relativeTime(r.startedAt, now)}
                    </td>
                    <td className={`${ADMIN_TD} ${ADMIN_MONO_DIM}`}>
                      {durationLabel(r.startedAt, r.finishedAt) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-1 text-sm text-[var(--muted)]">
            No cron runs recorded.
          </p>
        )}
      </ResourceStatus>

      {runs.value && runs.value.total > runs.value.pageSize ? (
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
};
