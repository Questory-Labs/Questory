"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchOtelHealth,
  fetchOtelTrace,
  fetchOtelTraces,
  fetchOtelUsage,
  type OtelHealth,
  type OtelTraceDetail,
  type OtelTraceSummary,
  type OtelUsage,
} from "@/lib/enterprise-api";

function formatDurationNs(ns?: number): string {
  if (ns == null || Number.isNaN(ns)) return "—";
  if (ns < 1_000_000) return `${Math.round(ns / 1_000)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(1)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

function asUsage(data: unknown): OtelUsage {
  if (!data || typeof data !== "object") return {};
  return data as OtelUsage;
}

function asTraces(data: unknown): OtelTraceSummary[] {
  if (Array.isArray(data)) return data as OtelTraceSummary[];
  if (data && typeof data === "object" && Array.isArray((data as { traces?: unknown }).traces)) {
    return (data as { traces: OtelTraceSummary[] }).traces;
  }
  return [];
}

function asTraceDetail(data: unknown): OtelTraceDetail | null {
  if (!data || typeof data !== "object") return null;
  return data as OtelTraceDetail;
}

function usageNumber(
  usage: OtelUsage,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const v = usage[key];
    if (typeof v === "number") return v;
  }
  return undefined;
}

export function TelemetryDashboard() {
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const health = useQuery({
    queryKey: ["enterprise-otel-health"],
    queryFn: fetchOtelHealth,
    refetchInterval: 30_000,
    retry: false,
  });

  const usage = useQuery({
    queryKey: ["enterprise-otel-usage", range],
    queryFn: () => fetchOtelUsage(range),
    refetchInterval: 60_000,
    retry: false,
  });

  const traces = useQuery({
    queryKey: ["enterprise-otel-traces", range],
    queryFn: () => fetchOtelTraces({ since: range, limit: 40 }),
    refetchInterval: 60_000,
    retry: false,
  });

  const traceDetail = useQuery({
    queryKey: ["enterprise-otel-trace", selectedTraceId],
    queryFn: () => fetchOtelTrace(selectedTraceId as string),
    enabled: Boolean(selectedTraceId),
    retry: false,
  });

  const h: OtelHealth | undefined = health.data;
  const u = asUsage(usage.data);
  const traceList = asTraces(traces.data);
  const detail = asTraceDetail(traceDetail.data);

  const inputTokens = usageNumber(u, [
    "input_tokens",
    "total_input_tokens",
    "prompt_tokens",
  ]);
  const outputTokens = usageNumber(u, [
    "output_tokens",
    "total_output_tokens",
    "completion_tokens",
  ]);
  const totalTokens =
    usageNumber(u, ["total_tokens", "tokens"]) ??
    (inputTokens != null || outputTokens != null
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : undefined);
  const requestCount = usageNumber(u, [
    "request_count",
    "requests",
    "count",
  ]);

  const collectorOk = h?.ok === true;
  const collectorError =
    health.isError || h?.ok === false
      ? h?.error || (health.error as Error | undefined)?.message || "unreachable"
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display text-2xl tracking-tight text-[var(--ink)]"
            style={{ fontWeight: 700 }}
          >
            Telemetry
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            AI usage and traces from the enterprise OTLP collector (Postgres
            `enterprise.otel_spans`).
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {(["24h", "7d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 transition ${
                range === r
                  ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <section className="border border-[var(--line)] bg-[var(--bg-1)] p-4">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">
          Collector
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Status:{" "}
          <span className="text-[var(--ink)]">
            {health.isLoading
              ? "Checking…"
              : collectorOk
                ? "Healthy"
                : `Down${collectorError ? ` (${collectorError})` : ""}`}
          </span>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Requests" value={requestCount} loading={usage.isLoading} />
        <Stat label="Input tokens" value={inputTokens} loading={usage.isLoading} />
        <Stat
          label="Output tokens"
          value={outputTokens}
          loading={usage.isLoading}
        />
        <Stat label="Total tokens" value={totalTokens} loading={usage.isLoading} />
      </section>

      {usage.isError ? (
        <p className="text-sm text-[var(--muted)]">
          Usage unavailable: {(usage.error as Error).message}
        </p>
      ) : null}

      {Array.isArray(u.by_model) || Array.isArray(u.models) ? (
        <section className="border border-[var(--line)] bg-[var(--bg-1)] p-4">
          <h2 className="font-display text-lg font-bold text-[var(--ink)]">
            By model
          </h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-[var(--muted)]">
            {(
              (u.by_model as Array<Record<string, unknown>>) ||
              (u.models as Array<Record<string, unknown>>) ||
              []
            ).map((row, i) => {
              const model = String(
                row.model ?? row.name ?? row.request_model ?? `model-${i}`,
              );
              const tokens =
                row.total_tokens ?? row.tokens ?? row.output_tokens ?? "—";
              return (
                <li key={model} className="flex justify-between gap-4">
                  <span>{model}</span>
                  <span className="text-[var(--ink)]">{String(tokens)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="border border-[var(--line)] bg-[var(--bg-1)] p-4">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">
          Recent traces
        </h2>
        {traces.isLoading ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Loading traces…</p>
        ) : traces.isError ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {(traces.error as Error).message}
          </p>
        ) : traceList.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No traces yet. Run a curation job with OTLP export enabled.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="py-2 pr-3 font-medium">Root span</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Spans</th>
                  <th className="py-2 font-medium">Trace</th>
                </tr>
              </thead>
              <tbody>
                {traceList.map((t) => {
                  const id = t.trace_id || t.traceId || "";
                  const name =
                    t.root_span || t.rootSpan || t.name || "trace";
                  const duration =
                    t.duration_ns ?? t.durationNs ?? t.duration;
                  const spans = t.span_count ?? t.spanCount ?? t.spans;
                  return (
                    <tr
                      key={id || name}
                      className="border-b border-[var(--line)]/60"
                    >
                      <td className="py-2 pr-3 text-[var(--ink)]">{name}</td>
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
      </section>

      {selectedTraceId ? (
        <section className="border border-[var(--line)] bg-[var(--bg-1)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">
              Trace detail
            </h2>
            <button
              type="button"
              onClick={() => setSelectedTraceId(null)}
              className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Close
            </button>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {selectedTraceId}
          </p>
          {traceDetail.isLoading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading spans…</p>
          ) : traceDetail.isError ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {(traceDetail.error as Error).message}
            </p>
          ) : (
            <ul className="mt-4 space-y-2 font-mono text-xs">
              {(detail?.spans || []).map((span, i) => {
                const name = span.name || span.span_name || `span-${i}`;
                const duration =
                  span.duration_ns ?? span.durationNs ?? span.duration;
                const model =
                  span.attributes?.["gen_ai.request.model"] ||
                  span["gen_ai.request.model"];
                const input =
                  span.attributes?.["gen_ai.usage.input_tokens"] ??
                  span["gen_ai.usage.input_tokens"];
                const output =
                  span.attributes?.["gen_ai.usage.output_tokens"] ??
                  span["gen_ai.usage.output_tokens"];
                return (
                  <li
                    key={`${name}-${i}`}
                    className="border-l-2 border-[var(--line)] pl-3"
                  >
                    <div className="text-[var(--ink)]">{name}</div>
                    <div className="mt-0.5 text-[var(--muted)]">
                      {typeof duration === "number"
                        ? formatDurationNs(duration)
                        : null}
                      {model != null ? ` · model ${String(model)}` : null}
                      {input != null ? ` · in ${String(input)}` : null}
                      {output != null ? ` · out ${String(output)}` : null}
                    </div>
                  </li>
                );
              })}
              {!detail?.spans?.length ? (
                <li className="text-[var(--muted)]">No span details returned.</li>
              ) : null}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="border border-[var(--line)] bg-[var(--bg-1)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div
        className="mt-2 font-display text-2xl text-[var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {loading ? "…" : value != null ? value.toLocaleString() : "—"}
      </div>
    </div>
  );
}
