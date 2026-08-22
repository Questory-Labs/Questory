"use client";

import { Panel, ResourceStatus } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { OtelTracesPage } from "@/lib/enterprise-api";
import { TELEMETRY_PAGE_SIZE } from "@/lib/pagination";
import { formatDurationNs, statusTone } from "../enterprise.telemetry.utils";
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
    <Panel className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--ink)]">
            Recent traces
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
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
          <p className="mt-3 text-sm text-[var(--muted)]">Loading traces…</p>
        }
        error={
          <p className="mt-3 text-sm text-[var(--muted)]">
            {(traces.error as Error)?.message}
          </p>
        }
      >
        {traceList.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No traces yet. Run a curation job with OTLP export enabled.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="py-2 pr-3 font-medium">Root span</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Spans</th>
                  <th className="py-2 font-medium">Trace</th>
                </tr>
              </thead>
              <tbody>
                {traceList.map((t) => {
                  const id = t.trace_id || t.traceId || "";
                  const name = t.root_span || t.rootSpan || t.name || "trace";
                  const duration =
                    t.duration_ns ?? t.durationNs ?? t.duration;
                  const spans = t.span_count ?? t.spanCount ?? t.spans;
                  const selected = id && id === selectedTraceId;
                  return (
                    <tr
                      key={id || name}
                      className={`border-b border-[var(--line)]/60 transition ${
                        selected
                          ? "bg-[var(--accent-dim)]/40"
                          : "hover:bg-[var(--bg-2)]/60"
                      }`}
                    >
                      <td className="py-2 pr-3 text-[var(--ink)]">{name}</td>
                      <td
                        className={`py-2 pr-3 font-mono text-xs ${statusTone(t.status)}`}
                      >
                        {t.status || "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-[var(--muted)]">
                        {typeof duration === "number"
                          ? formatDurationNs(duration)
                          : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-[var(--muted)]">
                        {spans ?? "—"}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={!id}
                          onClick={() => setSelectedTraceId(id)}
                          className="font-mono text-xs text-[var(--accent)] hover:underline disabled:opacity-40"
                        >
                          {id ? `${id.slice(0, 12)}…` : "—"}
                        </button>
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
        <div className="mt-4 flex justify-end">
          <TelemetryPagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            disabled={traces.empty}
          />
        </div>
      ) : null}
    </Panel>
  );
};
