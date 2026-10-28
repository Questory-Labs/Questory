"use client";

import { Button } from "@/components/ui";
import { relativeTime } from "../../jobs/admin.jobs.utils";
import {
  ADMIN_MONO_DIM,
  ADMIN_ROW,
  ADMIN_TABLE,
  ADMIN_TABLE_WRAP,
  ADMIN_TD,
  ADMIN_TH,
} from "../../shared/admin.styles";
import { statusTone } from "../../shared/admin.tone";
import { AdminStatusPill } from "../../shared/components/AdminStatusPill";
import type { EnrichmentItem } from "../admin.enrichment.types";
import { formatWhen } from "../admin.enrichment.utils";

const statusText = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";

export const EnrichmentTable = ({
  items,
  canRequeue,
  busy,
  onRequeue,
}: {
  items: EnrichmentItem[];
  canRequeue: boolean;
  busy: boolean;
  onRequeue: (item: EnrichmentItem) => void;
}) => {
  const now = Date.now();
  return (
    <div
      className={ADMIN_TABLE_WRAP}
      style={{ "--i": 6 } as React.CSSProperties}
    >
      <table className={`${ADMIN_TABLE} min-w-[720px]`}>
        <thead>
          <tr>
            <th scope="col" className={ADMIN_TH}>
              Status
            </th>
            <th scope="col" className={ADMIN_TH}>
              Title
            </th>
            <th scope="col" className={`${ADMIN_TH} text-right`}>
              Attempts
            </th>
            <th scope="col" className={ADMIN_TH}>
              Created
            </th>
            <th scope="col" className={ADMIN_TH}>
              Error
            </th>
            {canRequeue ? (
              <th scope="col" className={ADMIN_TH}>
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((job) => (
            <tr key={job.id} className={`${ADMIN_ROW} align-top`}>
              <td className={ADMIN_TD}>
                <AdminStatusPill
                  tone={statusTone(job.status)}
                  live={job.status === "running"}
                >
                  {statusText(job.status)}
                </AdminStatusPill>
              </td>
              <td className={ADMIN_TD}>
                <div className="font-normal text-[var(--ink)]">{job.label}</div>
                <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                  {job.detail || job.refId.slice(0, 8)}
                  {" · "}
                  {job.id.slice(0, 8)}
                </div>
              </td>
              <td
                className={`${ADMIN_TD} text-right font-mono tabular-nums text-[var(--muted)]`}
              >
                {job.attempts ?? "—"}
              </td>
              <td
                className={`${ADMIN_TD} ${ADMIN_MONO_DIM}`}
                title={formatWhen(job.createdAt)}
              >
                {relativeTime(job.createdAt, now)}
                {job.completedAt ? (
                  <div className="mt-0.5 text-[10px] text-[var(--faint)]">
                    done {relativeTime(job.completedAt, now)}
                  </div>
                ) : null}
              </td>
              <td
                className={`${ADMIN_TD} max-w-xs font-mono text-xs ${
                  job.error ? "text-[var(--danger)]" : "text-[var(--dim)]"
                }`}
              >
                {job.error || "—"}
              </td>
              {canRequeue ? (
                <td className="px-3.5 py-1.5 text-right">
                  {job.status === "failed" ? (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      aria-label={`Requeue ${job.label}`}
                      disabled={busy}
                      onClick={() => onRequeue(job)}
                    >
                      Requeue
                    </Button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
