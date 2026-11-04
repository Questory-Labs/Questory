import Link from "next/link";
import { durationLabel, relativeTime } from "../../jobs/admin.jobs.utils";
import { TONE_TEXT, statusTone } from "../../shared/admin.tone";
import { AdminStatusDot } from "../../shared/components/AdminStatusPill";
import { cronStatusLabel } from "../admin.home.utils";
import type { RecentCronRun } from "../admin.home.types";

export const RecentJobsPanel = ({ runs }: { runs: RecentCronRun[] }) => (
  <section
    aria-labelledby="admin-recent-jobs"
    className="panel q-in [--i:10] min-w-0 flex-[999_1_520px] px-3 pb-2.5 pt-[18px]"
  >
    <div className="flex items-baseline justify-between px-2">
      <h2 id="admin-recent-jobs" className="text-base font-normal">
        Recent jobs
      </h2>
      <Link href="/admin/jobs" className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
        All jobs
      </Link>
    </div>
    {runs.length ? (
      <ul className="mt-2">
        {runs.map((run) => {
          const tone = statusTone(run.status);
          const duration = durationLabel(run.startedAt, run.finishedAt);
          return (
            <li
              key={run.id}
              className="q-row grid min-h-11 grid-cols-[14px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[14px] px-2"
              title={run.error ?? undefined}
            >
              <AdminStatusDot tone={tone} live={tone === "danger"} />
              <span className="truncate font-mono text-[13px]">{run.jobName}</span>
              <span className="font-mono text-[11px] text-[var(--faint)]">
                {relativeTime(run.startedAt)}
                {duration ? ` · ${duration}` : ""}
              </span>
              <span
                className={`inline-flex items-center rounded-full border border-white/10 px-2.5 py-[3px] text-xs ${TONE_TEXT[tone]}`}
              >
                {cronStatusLabel(run.status)}
              </span>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="px-2 py-4 text-sm text-[var(--muted)]">No runs yet.</p>
    )}
  </section>
);
