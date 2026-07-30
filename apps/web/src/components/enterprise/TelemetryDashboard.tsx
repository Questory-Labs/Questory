"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { StatCard } from "@/components/StatCard";
import { Button, Panel } from "@/components/ui";
import {
  fetchOtelHealth,
  fetchOtelPricing,
  fetchOtelTrace,
  fetchOtelTraces,
  fetchOtelUsage,
  saveOtelPricing,
  type OtelHealth,
  type OtelModelPricing,
  type OtelModelUsage,
  type OtelSpan,
  type OtelTraceDetail,
  type OtelUsage,
  type OtelUsageBucket,
} from "@/lib/enterprise-api";

const PAGE_SIZE = 20;
const TIME_RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;
type TimeRange = (typeof TIME_RANGES)[number];
const COLOR_REQUESTS = "#7dd3c0";
const COLOR_INPUT = "#5bb8a8";
const COLOR_OUTPUT = "#c4a35a";
const COLOR_TOTAL = "#8a9bb8";
const COLOR_COST = "#d4a27f";

function formatDurationNs(ns?: number): string {
  if (ns == null || Number.isNaN(ns)) return "—";
  if (ns < 1_000_000) return `${Math.round(ns / 1_000)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(1)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatUsd(amount: number | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (amount === 0) return "$0";
  if (Math.abs(amount) < 0.0001) return "<$0.0001";
  if (Math.abs(amount) >= 1) {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${amount.toFixed(4)}`;
}

function formatBucketLabel(iso: string, granularity?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === "day") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function usageNumber(usage: OtelUsage, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = usage[key];
    if (typeof v === "number") return v;
  }
  return undefined;
}

function statusTone(status?: string): string {
  const s = (status || "").toUpperCase();
  if (s === "ERROR" || s === "2") return "text-[var(--danger)]";
  if (s === "OK" || s === "1") return "text-[var(--accent)]";
  return "text-[var(--muted)]";
}

function attrString(
  span: OtelSpan,
  key: string,
): string | number | boolean | null {
  const fromAttrs = span.attributes?.[key];
  if (
    typeof fromAttrs === "string" ||
    typeof fromAttrs === "number" ||
    typeof fromAttrs === "boolean"
  ) {
    return fromAttrs;
  }
  const direct = span[key];
  if (
    typeof direct === "string" ||
    typeof direct === "number" ||
    typeof direct === "boolean"
  ) {
    return direct;
  }
  return null;
}

type SpanNode = {
  span: OtelSpan;
  depth: number;
  children: SpanNode[];
};

function buildSpanTree(spans: OtelSpan[]): SpanNode[] {
  const byId = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  for (const span of spans) {
    const id = String(span.span_id || "");
    byId.set(id || `anon-${byId.size}`, { span, depth: 0, children: [] });
  }

  for (const node of byId.values()) {
    const parentId = node.span.parent_span_id
      ? String(node.span.parent_span_id)
      : "";
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const assignDepth = (nodes: SpanNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      n.children.sort(
        (a, b) =>
          (a.span.start_time_unix_nano ?? 0) -
          (b.span.start_time_unix_nano ?? 0),
      );
      assignDepth(n.children, depth + 1);
    }
  };
  roots.sort(
    (a, b) =>
      (a.span.start_time_unix_nano ?? 0) - (b.span.start_time_unix_nano ?? 0),
  );
  assignDepth(roots, 0);
  return roots;
}

function flattenTree(nodes: SpanNode[]): SpanNode[] {
  const out: SpanNode[] = [];
  const walk = (list: SpanNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function TelemetryDashboard() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<TimeRange>("24h");
  const [page, setPage] = useState(0);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [pricingDraft, setPricingDraft] = useState<OtelModelPricing[] | null>(
    null,
  );
  const [pricingOpen, setPricingOpen] = useState(false);
  const [newModel, setNewModel] = useState("");

  useEffect(() => {
    setPage(0);
  }, [range]);

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

  const pricing = useQuery({
    queryKey: ["enterprise-otel-pricing"],
    queryFn: fetchOtelPricing,
    retry: false,
  });

  const traces = useQuery({
    queryKey: ["enterprise-otel-traces", range, page],
    queryFn: () =>
      fetchOtelTraces({
        since: range,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    refetchInterval: 60_000,
    retry: false,
  });

  const savePricing = useMutation({
    mutationFn: (models: OtelModelPricing[]) => saveOtelPricing(models),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["enterprise-otel-pricing"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["enterprise-otel-usage"],
      });
      setPricingDraft(null);
    },
  });

  const h: OtelHealth | undefined = health.data;
  const u = (usage.data || {}) as OtelUsage;
  const tracePage = traces.data;
  const traceList = tracePage?.traces ?? [];
  const totalTraces = tracePage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTraces / PAGE_SIZE));

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
  const cachedTokens = usageNumber(u, ["cached_tokens"]);
  const reasoningTokens = usageNumber(u, ["reasoning_tokens"]);
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
  const costUsd = usageNumber(u, ["cost_usd"]);
  const avgCost = usageNumber(u, ["avg_cost_per_request"]);
  const costPer1m = usageNumber(u, ["cost_per_1m_tokens"]);
  const pricingConfigured = u.pricing_configured === true;

  const series = useMemo(() => {
    const raw = (u.timeseries || []) as OtelUsageBucket[];
    return raw.map((b) => ({
      ...b,
      label: formatBucketLabel(b.t, u.timeseries_granularity),
      cost_usd: b.cost_usd ?? 0,
    }));
  }, [u.timeseries, u.timeseries_granularity]);

  const modelRows = useMemo(() => {
    const rows = (u.by_model || u.models || []) as OtelModelUsage[];
    return rows.map((row) => ({
      model: row.model || "unknown",
      request_count: row.request_count ?? 0,
      input_tokens: row.input_tokens ?? 0,
      output_tokens: row.output_tokens ?? 0,
      cached_tokens: row.cached_tokens ?? 0,
      reasoning_tokens: row.reasoning_tokens ?? 0,
      total_tokens: row.total_tokens ?? 0,
      avg_duration_ns: row.avg_duration_ns,
      cost_usd: row.cost_usd ?? 0,
      priced: row.priced === true,
    }));
  }, [u.by_model, u.models]);

  const pricingRows = useMemo(() => {
    if (pricingDraft) return pricingDraft;
    const fromApi = pricing.data?.models ?? [];
    const seen = new Set(fromApi.map((m) => m.model));
    const merged = [...fromApi];
    for (const row of modelRows) {
      if (!seen.has(row.model)) {
        seen.add(row.model);
        merged.push({
          model: row.model,
          input: 0,
          output: 0,
          cached: 0,
          reasoning: 0,
        });
      }
    }
    return merged;
  }, [pricingDraft, pricing.data?.models, modelRows]);

  const updatePricingRow = (
    index: number,
    field: keyof OtelModelPricing,
    value: string,
  ) => {
    setPricingDraft((prev) => {
      const base = prev ?? pricingRows.map((r) => ({ ...r }));
      const next = base.map((r) => ({ ...r }));
      const row = { ...next[index] };
      if (field === "model") {
        row.model = value;
      } else {
        const n = Number(value);
        row[field] = Number.isFinite(n) && n >= 0 ? n : 0;
      }
      next[index] = row;
      return next;
    });
  };

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
            AI usage and traces from the QEngine OTLP collector.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-sm">
          {TIME_RANGES.map((r) => (
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

      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
            Collector
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {health.isLoading
              ? "Checking…"
              : collectorOk
                ? "Healthy"
                : `Down${collectorError ? ` (${collectorError})` : ""}`}
          </p>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            collectorOk ? "bg-[var(--accent)]" : "bg-[var(--danger)]"
          }`}
          aria-hidden
        />
      </Panel>

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Est. cost"
          value={
            usage.isLoading
              ? "…"
              : pricingConfigured
                ? formatUsd(costUsd)
                : "—"
          }
          hint={
            pricingConfigured
              ? undefined
              : "Set model rates below to estimate spend"
          }
        />
        <StatCard
          label="Avg / request"
          value={
            usage.isLoading
              ? "…"
              : pricingConfigured
                ? formatUsd(avgCost)
                : "—"
          }
        />
        <StatCard
          label="Cost / 1M tokens"
          value={
            usage.isLoading
              ? "…"
              : pricingConfigured
                ? formatUsd(costPer1m)
                : "—"
          }
        />
        <StatCard
          label="Cached · Reasoning"
          value={
            usage.isLoading
              ? "…"
              : `${formatCompact(cachedTokens ?? 0)} · ${formatCompact(reasoningTokens ?? 0)}`
          }
        />
      </section>

      <TitledPanel title="Model pricing ($ / 1M tokens)">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            Stored on QEngine. Costs are computed server-side from
            these rates.
          </p>
          <button
            type="button"
            onClick={() => setPricingOpen((v) => !v)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            {pricingOpen ? "Hide" : "Edit rates"}
          </button>
        </div>
        {pricingOpen ? (
          <div className="mt-3 space-y-3">
            {pricing.isError ? (
              <p className="text-sm text-[var(--danger)]">
                {(pricing.error as Error).message}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="text-xs text-[var(--muted)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="py-2 pr-2 font-medium">Model</th>
                    <th className="py-2 pr-2 font-medium">Input</th>
                    <th className="py-2 pr-2 font-medium">Output</th>
                    <th className="py-2 pr-2 font-medium">Cached</th>
                    <th className="py-2 pr-2 font-medium">Reasoning</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.map((row, i) => (
                    <tr
                      key={`${row.model}-${i}`}
                      className="border-b border-[var(--line)]/50"
                    >
                      {(
                        ["model", "input", "output", "cached", "reasoning"] as const
                      ).map((field) => (
                        <td key={field} className="py-1.5 pr-2">
                          <input
                            type={field === "model" ? "text" : "number"}
                            min={field === "model" ? undefined : 0}
                            step={field === "model" ? undefined : "0.01"}
                            value={
                              field === "model" ? row.model : String(row[field])
                            }
                            onChange={(e) =>
                              updatePricingRow(i, field, e.target.value)
                            }
                            className="w-full min-w-[4.5rem] border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1 font-mono text-xs text-[var(--ink)]"
                          />
                        </td>
                      ))}
                      <td className="py-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPricingDraft(
                              pricingRows.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Add model name"
                className="border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5 font-mono text-xs text-[var(--ink)]"
              />
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => {
                  const name = newModel.trim();
                  if (!name) return;
                  if (pricingRows.some((r) => r.model === name)) {
                    setNewModel("");
                    return;
                  }
                  setPricingDraft([
                    ...pricingRows,
                    {
                      model: name,
                      input: 0,
                      output: 0,
                      cached: 0,
                      reasoning: 0,
                    },
                  ]);
                  setNewModel("");
                }}
              >
                Add model
              </Button>
              <Button
                className="px-2.5 py-1 text-xs"
                disabled={savePricing.isPending}
                onClick={() => savePricing.mutate(pricingRows)}
              >
                {savePricing.isPending ? "Saving…" : "Save rates"}
              </Button>
              {pricingDraft ? (
                <button
                  type="button"
                  onClick={() => setPricingDraft(null)}
                  className="text-xs text-[var(--muted)] hover:underline"
                >
                  Reset
                </button>
              ) : null}
              {savePricing.isError ? (
                <span className="text-xs text-[var(--danger)]">
                  {(savePricing.error as Error).message}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </TitledPanel>

      {usage.isError ? (
        <p className="text-sm text-[var(--muted)]">
          Usage unavailable: {(usage.error as Error).message}
        </p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <TitledPanel title={`Tokens over time (${u.timeseries_granularity || "bucket"})`}>
          {usage.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : series.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No token samples yet.</p>
          ) : (
            <MultiLineChart
              data={series}
              ariaLabel="Tokens over time"
              size="md"
              formatXLabel={(l) => l}
              series={[
                {
                  key: "input_tokens",
                  name: "Input",
                  color: COLOR_INPUT,
                  variant: "area",
                },
                {
                  key: "output_tokens",
                  name: "Output",
                  color: COLOR_OUTPUT,
                  variant: "area",
                },
              ]}
            />
          )}
        </TitledPanel>

        <TitledPanel title="Requests & cost over time">
          {usage.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : series.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No request samples yet.</p>
          ) : (
            <MultiLineChart
              data={series}
              ariaLabel="Requests and cost over time"
              size="md"
              formatXLabel={(l) => l}
              yAxes={[
                {
                  id: "req",
                  side: "left",
                  formatTick: formatCompact,
                },
                {
                  id: "cost",
                  side: "right",
                  formatTick: (v) => formatUsd(v),
                },
              ]}
              series={[
                {
                  key: "request_count",
                  name: "Requests",
                  color: COLOR_REQUESTS,
                  yAxisId: "req",
                },
                {
                  key: "total_tokens",
                  name: "Total tokens",
                  color: COLOR_TOTAL,
                  yAxisId: "req",
                  strokeDasharray: "4 4",
                },
                ...(pricingConfigured
                  ? [
                      {
                        key: "cost_usd",
                        name: "Cost",
                        color: COLOR_COST,
                        yAxisId: "cost",
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </TitledPanel>
      </section>

      {modelRows.length > 0 ? (
        <TitledPanel title="By model">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <LineChart
              data={[...modelRows]
                .sort(
                  (a, b) =>
                    (pricingConfigured ? b.cost_usd : b.total_tokens) -
                    (pricingConfigured ? a.cost_usd : a.total_tokens),
                )
                .map((row) => ({
                  label:
                    row.model.length > 18
                      ? `${row.model.slice(0, 17)}…`
                      : row.model,
                  value: pricingConfigured ? row.cost_usd : row.total_tokens,
                }))}
              ariaLabel="Usage by model"
              size="md"
              formatXLabel={(l) => l}
              formatValue={(n) =>
                pricingConfigured ? formatUsd(n) : n.toLocaleString()
              }
              formatYTick={(n) =>
                pricingConfigured ? formatUsd(n) : formatCompact(n)
              }
              valueLabel={pricingConfigured ? "cost" : "tokens"}
            />
            <ul className="space-y-2 font-mono text-xs">
              {modelRows.map((row) => (
                <li
                  key={row.model}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)]/50 pb-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[var(--ink)]">{row.model}</div>
                    <div className="mt-0.5 text-[var(--muted)]">
                      {row.request_count.toLocaleString()} req
                      {row.avg_duration_ns != null
                        ? ` · avg ${formatDurationNs(row.avg_duration_ns)}`
                        : null}
                      {!row.priced && pricingConfigured
                        ? " · no rate"
                        : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[var(--ink)]">
                    <div>
                      {pricingConfigured
                        ? formatUsd(row.cost_usd)
                        : row.total_tokens.toLocaleString()}
                    </div>
                    <div className="text-[var(--muted)]">
                      {row.input_tokens.toLocaleString()} in ·{" "}
                      {row.output_tokens.toLocaleString()} out
                      {row.cached_tokens > 0
                        ? ` · ${row.cached_tokens.toLocaleString()} cached`
                        : null}
                      {row.reasoning_tokens > 0
                        ? ` · ${row.reasoning_tokens.toLocaleString()} reason`
                        : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TitledPanel>
      ) : null}

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
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            disabled={traces.isLoading}
          />
        </div>

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
                        selected ? "bg-[var(--accent-dim)]/40" : "hover:bg-[var(--bg-2)]/60"
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

        {totalTraces > PAGE_SIZE ? (
          <div className="mt-4 flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              disabled={traces.isLoading}
            />
          </div>
        ) : null}
      </Panel>

      <TraceSidebar
        traceId={selectedTraceId}
        onClose={() => setSelectedTraceId(null)}
      />
    </div>
  );
}

function TraceSidebar({
  traceId,
  onClose,
}: {
  traceId: string | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const detail = useQuery({
    queryKey: ["enterprise-otel-trace", traceId],
    queryFn: () => fetchOtelTrace(traceId as string),
    enabled: Boolean(traceId),
    retry: false,
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

  const data: OtelTraceDetail | undefined = detail.data;
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
          {detail.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading spans…</p>
          ) : detail.isError ? (
            <p className="text-sm text-[var(--danger)]">
              {(detail.error as Error).message}
            </p>
          ) : spans.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No span details returned.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Input" value={totals.input.toLocaleString()} />
                <MiniStat label="Output" value={totals.output.toLocaleString()} />
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
                      <div key={`${span.span_id || name}-${i}`} className="space-y-1">
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
                    const input = attrString(span, "gen_ai.usage.input_tokens");
                    const output = attrString(
                      span,
                      "gen_ai.usage.output_tokens",
                    );
                    const attrs = span.attributes || {};
                    const attrEntries = Object.entries(attrs).sort(([a], [b]) =>
                      a.localeCompare(b),
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
                              {input != null ? ` · in ${String(input)}` : null}
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
        </div>
      </aside>
    </div>
  );
}

function formatAttrValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function TitledPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Panel className="p-4">
      <h2 className="font-display text-lg font-bold text-[var(--ink)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </Panel>
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
    <StatCard
      label={label}
      value={loading ? "…" : value != null ? value.toLocaleString() : "—"}
    />
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Panel size="sm" className="bg-[var(--bg-0)] px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-[var(--ink)]">{value}</div>
    </Panel>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        disabled={disabled || page <= 0}
        onClick={() => onChange(page - 1)}
        className="px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
      >
        Prev
      </button>
      <span className="font-mono text-[var(--muted)]">
        {page + 1}/{totalPages}
      </span>
      <button
        type="button"
        disabled={disabled || page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
