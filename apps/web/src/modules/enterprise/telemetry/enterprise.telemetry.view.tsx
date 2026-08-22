"use client";

import { StatCard } from "@/components/StatCard";
import { Panel, ResourceStatus, SkeletonStatGrid } from "@questorylabs/ui";
import { TIME_RANGES } from "./enterprise.telemetry.constants";
import type { TelemetryViewProps } from "./enterprise.telemetry.types";
import { formatCompact, formatUsd } from "./enterprise.telemetry.utils";
import { ModelUsage } from "./components/ModelUsage";
import { PricingPanel } from "./components/PricingPanel";
import { TitledPanel, TelemetryStat } from "./components/TelemetryChrome";
import { TraceList } from "./components/TraceList";
import { TraceSidebar } from "./components/TraceSidebar";
import { UsageCharts } from "./components/UsageCharts";

export const TelemetryView = (props: Record<string, unknown>) => {
  const {
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
    usageGranularity,
  } = props as TelemetryViewProps;

  if (enterpriseLoading) {
    return (
      <p className="text-sm text-[var(--muted)]">Checking QEngine…</p>
    );
  }

  if (!enabled) {
    return (
      <p className="text-sm text-[var(--muted)]">
        QEngine telemetry is not available on this instance.
      </p>
    );
  }

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
            {health.empty
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

      <ResourceStatus
        failed={usage.failed}
        empty={usage.empty}
        loading={
          <>
            <SkeletonStatGrid count={4} />
            <SkeletonStatGrid count={4} className="mt-4" />
          </>
        }
        error={
          <p className="text-sm text-[var(--muted)]">
            Usage unavailable: {(usage.error as Error)?.message}
          </p>
        }
      >
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TelemetryStat
              label="Requests"
              value={requestCount}
              loading={false}
            />
            <TelemetryStat
              label="Input tokens"
              value={inputTokens}
              loading={false}
            />
            <TelemetryStat
              label="Output tokens"
              value={outputTokens}
              loading={false}
            />
            <TelemetryStat
              label="Total tokens"
              value={totalTokens}
              loading={false}
            />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Est. cost"
              value={pricingConfigured ? formatUsd(costUsd) : "—"}
              hint={
                pricingConfigured
                  ? undefined
                  : "Set model rates below to estimate spend"
              }
            />
            <StatCard
              label="Avg / request"
              value={pricingConfigured ? formatUsd(avgCost) : "—"}
            />
            <StatCard
              label="Cost / 1M tokens"
              value={pricingConfigured ? formatUsd(costPer1m) : "—"}
            />
            <StatCard
              label="Cached · Reasoning"
              value={`${formatCompact(cachedTokens ?? 0)} · ${formatCompact(reasoningTokens ?? 0)}`}
            />
          </section>
        </>
      </ResourceStatus>

      <TitledPanel title="Model pricing ($ / 1M tokens)">
        <PricingPanel
          pricing={pricing}
          pricingOpen={pricingOpen}
          setPricingOpen={setPricingOpen}
          pricingRows={pricingRows}
          updatePricingRow={updatePricingRow}
          newModel={newModel}
          setNewModel={setNewModel}
          setPricingDraft={setPricingDraft}
          pricingDraft={pricingDraft}
          savePricing={savePricing}
        />
      </TitledPanel>

      <UsageCharts
        usage={usage}
        series={series}
        pricingConfigured={pricingConfigured}
        usageGranularity={usageGranularity}
      />

      <ModelUsage
        modelRows={modelRows}
        pricingConfigured={pricingConfigured}
      />

      <TraceList
        traces={traces}
        page={page}
        setPage={setPage}
        selectedTraceId={selectedTraceId}
        setSelectedTraceId={setSelectedTraceId}
        totalTraces={totalTraces}
        totalPages={totalPages}
      />

      <TraceSidebar
        traceId={selectedTraceId}
        onClose={() => setSelectedTraceId(null)}
      />
    </div>
  );
};
