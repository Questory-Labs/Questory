"use client";

import { ResourceStatus } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { OtelTracesPage } from "@/lib/enterprise-api";
import { TELEMETRY_PAGE_SIZE } from "@/lib/pagination";
import {
  ADMIN_ROW,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
} from "@/modules/admin/shared/admin.styles";
import { AdminStatusPill } from "@/modules/admin/shared/components/AdminStatusPill";
import { formatDurationNs, traceTone } from "../enterprise.telemetry.utils";
import { TelemetryPagination } from "./TelemetryChrome";

type TraceListProps = {
  traces: UseResourceResult<OtelTracesPage>;
  page: number;
  setPage: (page: number) => void;
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  totalTraces: number;
  totalPages: number;
};

export const TraceList = ({
  traces,
  page,
  setPage,
  selectedTraceId,
  setSelectedTraceId,
  totalTraces,
  totalPages,
}: TraceListProps) => {
  const traceList = traces.value?.traces ?? [];

  return (
    <section
      aria-labelledby="telemetry-traces"
      className="panel q-in min-w-0 px-1.5 pb-1.5 pt-[18px]"
      style={{ "--i": 12 } as React.CSSProperties}
    >
      <div className="mx-3.5 mb-1.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="telemetry-traces" className={ADMIN_SECTION_TITLE}>
            Traces
          </h2>
          <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
            {totalTraces.toLocaleString()} total · page {page + 1} of{" "}
            {totalPages}
          </p>
        </div>
        <TelemetryPagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          disabled={traces.empty}
        />
      </div>

      <ResourceStatus
        failed={traces.failed}
        empty={traces.empty}
        loading={
          <p className="px-3.5 py-3 text-sm text-[var(--muted)]">
            Loading traces…
          </p>
        }
        error={
          <p className="px-3.5 py-3 text-sm text-[var(--danger)]">
            {(traces.error as Error)?.message}
          </p>
        }
      >
        {traceList.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-[var(--muted)]">
            No traces yet. Run a curation job with OTLP export enabled.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${ADMIN_TABLE} min-w-[600px]`}>
              <thead>
                <tr>
                  <th scope="col" className={ADMIN_TH}>Trace</th>
                  <th scope="col" className={ADMIN_TH}>Root span</th>
                  <th scope="col" className={`${ADMIN_TH} text-right`}>Spans</th>
                  <th scope="col" className={`${ADMIN_TH} text-right`}>Duration</th>
                  <th scope="col" className={ADMIN_TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {traceList.map((t) => {
                  const id = t.trace_id || t.traceId || "";
                  const name = t.root_span || t.rootSpan || t.name || "trace";
                  const duration =
                    t.duration_ns ?? t.durationNs ?? t.duration;
                  const spans = t.span_count ?? t.spanCount ?? t.spans;
                  const selected = Boolean(id) && id === selectedTraceId;
                  return (
                    <tr
                      key={id || name}
                      className={`${ADMIN_ROW} ${
                        selected ? "bg-[rgba(230,194,122,0.06)]" : ""
                      }`}
                    >
                      <td className="px-3.5">
                        <button
                          type="button"
                          disabled={!id}
                          aria-pressed={selected}
                          onClick={() => setSelectedTraceId(id)}
                          className="min-h-[42px] text-left font-mono text-[13px] text-[var(--ink)] hover:text-[var(--warm)] disabled:opacity-40"
                        >
                          {id ? `${id.slice(0, 12)}…` : "—"}
                        </button>
                      </td>
                      <td className={ADMIN_TD}>{name}</td>
                      <td className={`${ADMIN_TD} text-right font-mono text-[13px]`}>
                        {spans ?? "—"}
                      </td>
                      <td className={`${ADMIN_TD} text-right font-mono text-[13px]`}>
                        {typeof duration === "number"
                          ? formatDurationNs(duration)
                          : "—"}
                      </td>
                      <td className={ADMIN_TD}>
                        <AdminStatusPill tone={traceTone(t.status)}>
                          {t.status || "unset"}
                        </AdminStatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ResourceStatus>

      {totalTraces > TELEMETRY_PAGE_SIZE ? (
        <div className="flex justify-end px-3.5 pb-2.5 pt-3">
          <TelemetryPagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            disabled={traces.empty}
          />
        </div>
      ) : null}
    </section>
  );
};
