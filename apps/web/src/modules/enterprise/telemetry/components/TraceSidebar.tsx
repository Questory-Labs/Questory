"use client";

import { fetchOtelTrace, type OtelTraceDetail } from "@/lib/enterprise-api";
import { useResource } from "@questorylabs/qhttp/react";
import { Button, ResourceStatus } from "@questorylabs/ui";
import { useEffect, useMemo, useState } from "react";
import {
  attrString,
  buildSpanTree,
  flattenTree,
  formatAttrValue,
  formatDurationNs,
  statusTone,
} from "../enterprise.telemetry.utils";
import { MiniStat } from "./TelemetryChrome";

type TraceSidebarProps = {
  traceId: string | null;
  onClose: () => void;
};

export const TraceSidebar = ({ traceId, onClose }: TraceSidebarProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const detail = useResource({
    id: ["enterprise-otel-trace", traceId],
    load: () => fetchOtelTrace(traceId as string),
    when: Boolean(traceId),
    retries: false,
  });

  useEffect(() => {
    if (!traceId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [traceId, onClose]);

  useEffect(() => {
    setExpanded({});
  }, [traceId]);

  const data: OtelTraceDetail | undefined = detail.value;
  const spans = data?.spans || [];
  const tree = useMemo(() => buildSpanTree(spans), [spans]);
  const flat = useMemo(() => flattenTree(tree), [tree]);

  const t0 = spans.length
    ? Math.min(
        ...spans.map((s) => s.start_time_unix_nano ?? Number.POSITIVE_INFINITY),
      )
    : 0;
  const t1 = spans.length
    ? Math.max(...spans.map((s) => s.end_time_unix_nano ?? 0))
    : 0;
  const windowNs = Number.isFinite(t0) && t1 > t0 ? t1 - t0 : 1;

  const totals = useMemo(() => {
    let input = 0;
    let output = 0;
    let errors = 0;
    for (const span of spans) {
      const inTok = Number(attrString(span, "gen_ai.usage.input_tokens") ?? 0);
      const outTok = Number(
        attrString(span, "gen_ai.usage.output_tokens") ?? 0,
      );
      if (!Number.isNaN(inTok)) input += inTok;
      if (!Number.isNaN(outTok)) output += outTok;
      if ((span.status || "").toUpperCase() === "ERROR") errors += 1;
    }
    return { input, output, errors };
  }, [spans]);

  if (!traceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close trace details"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--line)] bg-[var(--bg-1)] shadow-[-12px_0_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Trace detail
            </p>
            <h2 className="mt-1 break-all font-mono text-sm font-semibold text-[var(--ink)]">
              {traceId}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {spans.length} span{spans.length === 1 ? "" : "s"}
              {Number.isFinite(t0) && t1 > 0
                ? ` · ${formatDurationNs(windowNs)}`
                : null}
              {totals.errors > 0 ? ` · ${totals.errors} error` : null}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-2.5 py-1 text-[var(--muted)]"
          >
            Esc
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ResourceStatus
            failed={detail.failed}
            empty={detail.empty}
            loading={
              <p className="text-sm text-[var(--muted)]">Loading spans…</p>
            }
            error={
              <p className="text-sm text-[var(--danger)]">
                {(detail.error as Error)?.message}
              </p>
            }
          >
            {spans.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No span details returned.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat
                    label="Input"
                    value={totals.input.toLocaleString()}
                  />
                  <MiniStat
                    label="Output"
                    value={totals.output.toLocaleString()}
                  />
                  <MiniStat
                    label="Total"
                    value={(totals.input + totals.output).toLocaleString()}
                  />
                </div>

                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    Timeline
                  </h3>
                  <div className="mt-3 space-y-2">
                    {flat.map((node, i) => {
                      const span = node.span;
                      const start = span.start_time_unix_nano ?? t0;
                      const dur =
                        span.duration_ns ??
                        (span.end_time_unix_nano != null &&
                        span.start_time_unix_nano != null
                          ? span.end_time_unix_nano - span.start_time_unix_nano
                          : 0);
                      const left = ((start - t0) / windowNs) * 100;
                      const width = Math.max((dur / windowNs) * 100, 0.8);
                      const name = span.name || span.span_name || `span-${i}`;
                      return (
                        <div
                          key={`${span.span_id || name}-${i}`}
                          className="space-y-1"
                        >
                          <div
                            className="truncate font-mono text-[11px] text-[var(--muted)]"
                            style={{ paddingLeft: node.depth * 12 }}
                          >
                            {name}
                          </div>
                          <div className="relative h-2 overflow-hidden rounded-sm bg-[var(--bg-2)]">
                            <div
                              className={`absolute inset-y-0 rounded-sm ${
                                (span.status || "").toUpperCase() === "ERROR"
                                  ? "bg-[var(--danger)]"
                                  : "bg-[var(--accent)]"
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    Spans
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {flat.map((node, i) => {
                      const span = node.span;
                      const id = String(span.span_id || `span-${i}`);
                      const open = expanded[id] === true;
                      const name = span.name || span.span_name || `span-${i}`;
                      const duration =
                        span.duration_ns ?? span.durationNs ?? span.duration;
                      const model = attrString(span, "gen_ai.request.model");
                      const op = attrString(span, "gen_ai.operation.name");
                      const system = attrString(span, "gen_ai.system");
                      const input = attrString(
                        span,
                        "gen_ai.usage.input_tokens",
                      );
                      const output = attrString(
                        span,
                        "gen_ai.usage.output_tokens",
                      );
                      const attrs = span.attributes || {};
                      const attrEntries = Object.entries(attrs).sort(
                        ([a], [b]) => a.localeCompare(b),
                      );

                      return (
                        <li
                          key={id}
                          className="border border-[var(--line)] bg-[var(--bg-0)]"
                          style={{ marginLeft: node.depth * 12 }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [id]: !open,
                              }))
                            }
                            className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-mono text-xs text-[var(--ink)]">
                                {name}
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                                {typeof duration === "number"
                                  ? formatDurationNs(duration)
                                  : "—"}
                                {model != null ? ` · ${String(model)}` : null}
                                {op != null ? ` · ${String(op)}` : null}
                                {input != null
                                  ? ` · in ${String(input)}`
                                  : null}
                                {output != null
                                  ? ` · out ${String(output)}`
                                  : null}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-[10px] uppercase ${statusTone(span.status)}`}
                            >
                              {span.status || "unset"}
                            </span>
                          </button>

                          {open ? (
                            <div className="space-y-3 border-t border-[var(--line)] px-3 py-3 font-mono text-[11px]">
                              <dl className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1.5 text-[var(--muted)]">
                                <dt>span_id</dt>
                                <dd className="break-all text-[var(--ink)]">
                                  {span.span_id || "—"}
                                </dd>
                                <dt>parent</dt>
                                <dd className="break-all text-[var(--ink)]">
                                  {span.parent_span_id || "—"}
                                </dd>
                                <dt>service</dt>
                                <dd className="text-[var(--ink)]">
                                  {span.service_name || "—"}
                                </dd>
                                <dt>system</dt>
                                <dd className="text-[var(--ink)]">
                                  {system != null ? String(system) : "—"}
                                </dd>
                                <dt>start</dt>
                                <dd className="text-[var(--ink)]">
                                  {span.start_time_unix_nano != null
                                    ? new Date(
                                        span.start_time_unix_nano / 1_000_000,
                                      ).toLocaleString()
                                    : "—"}
                                </dd>
                                <dt>end</dt>
                                <dd className="text-[var(--ink)]">
                                  {span.end_time_unix_nano != null
                                    ? new Date(
                                        span.end_time_unix_nano / 1_000_000,
                                      ).toLocaleString()
                                    : "—"}
                                </dd>
                              </dl>

                              {attrEntries.length > 0 ? (
                                <div>
                                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                                    Attributes
                                  </p>
                                  <ul className="space-y-1">
                                    {attrEntries.map(([key, value]) => (
                                      <li
                                        key={key}
                                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2"
                                      >
                                        <span className="truncate text-[var(--muted)]">
                                          {key}
                                        </span>
                                        <span className="break-all text-[var(--ink)]">
                                          {formatAttrValue(value)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </ResourceStatus>
        </div>
      </aside>
    </div>
  );
};
