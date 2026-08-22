"use client";

import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import {
  fetchOtelHealth,
  fetchOtelPricing,
  fetchOtelTraces,
  fetchOtelUsage,
  saveOtelPricing,
  type OtelHealth,
  type OtelModelPricing,
  type OtelModelUsage,
  type OtelUsage,
  type OtelUsageBucket,
} from "@/lib/enterprise-api";
import { TELEMETRY_PAGE_SIZE } from "@/lib/pagination";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type {
  TelemetryModelRow,
  TimeRange,
} from "./enterprise.telemetry.types";
import {
  formatBucketLabel,
  usageNumber,
} from "./enterprise.telemetry.utils";

export const TelemetryController = ({ children }: PropsWithChildren) => {
  const { enabled, isLoading: enterpriseLoading } = useEnterpriseEnabled();
  const store = useStore();
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

  const health = useResource({
    id: ["enterprise-otel-health"],
    load: fetchOtelHealth,
    refreshEvery: 30_000,
    retries: false,
    when: enabled,
  });

  const usage = useResource({
    id: ["enterprise-otel-usage", range],
    load: () => fetchOtelUsage(range),
    refreshEvery: 60_000,
    retries: false,
    when: enabled,
  });

  const pricing = useResource({
    id: ["enterprise-otel-pricing"],
    load: fetchOtelPricing,
    retries: false,
    when: enabled,
  });

  const traces = useResource({
    id: ["enterprise-otel-traces", range, page],
    load: () =>
      fetchOtelTraces({
        since: range,
        limit: TELEMETRY_PAGE_SIZE,
        offset: page * TELEMETRY_PAGE_SIZE,
      }),
    refreshEvery: 60_000,
    retries: false,
    when: enabled,
  });

  const savePricing = useAction({
    run: (models: OtelModelPricing[]) => saveOtelPricing(models),
    onSuccess: async () => {
      await store.touch(["enterprise-otel-pricing"]);
      await store.touch(["enterprise-otel-usage"]);
      setPricingDraft(null);
    },
  });

  const h: OtelHealth | undefined = health.value;
  const u = (usage.value || {}) as OtelUsage;
  const tracePage = traces.value;
  const totalTraces = tracePage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTraces / TELEMETRY_PAGE_SIZE));

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

  const series = useMemo(
    () =>
      ((u.timeseries || []) as OtelUsageBucket[]).map((b) => ({
        ...b,
        label: formatBucketLabel(b.t, u.timeseries_granularity),
        cost_usd: b.cost_usd ?? 0,
      })),
    [u.timeseries, u.timeseries_granularity],
  );

  const modelRows = useMemo((): TelemetryModelRow[] => {
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
    const fromApi = pricing.value?.models ?? [];
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
  }, [pricingDraft, pricing.value?.models, modelRows]);

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
    health.failed || h?.ok === false
      ? h?.error || (health.error as Error | undefined)?.message || "unreachable"
      : null;

  return cloneElements(children, {
    enabled,
    enterpriseLoading,
    range,
    setRange,
    page,
    setPage,
    selectedTraceId,
    setSelectedTraceId,
    health,
    usage,
    pricing,
    traces,
    savePricing,
    pricingOpen,
    setPricingOpen,
    newModel,
    setNewModel,
    pricingDraft,
    setPricingDraft,
    updatePricingRow,
    pricingRows,
    series,
    modelRows,
    inputTokens,
    outputTokens,
    cachedTokens,
    reasoningTokens,
    totalTokens,
    requestCount,
    costUsd,
    avgCost,
    costPer1m,
    pricingConfigured,
    collectorOk,
    collectorError,
    totalTraces,
    totalPages,
    usageGranularity: u.timeseries_granularity,
  });
};
