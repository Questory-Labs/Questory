"use client";

import { SegmentedControl } from "@/components/SegmentedControl";
import type { AdminTone } from "@/modules/admin/shared/admin.tone";
import { AdminStat } from "@/modules/admin/shared/components/AdminStat";
import { AdminStatusPill } from "@/modules/admin/shared/components/AdminStatusPill";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { TIME_RANGES } from "./enterprise.telemetry.constants";
import type { TelemetryViewProps } from "./enterprise.telemetry.types";
import {
  costSourceHint,
  formatCompact,
  formatUsd,
} from "./enterprise.telemetry.utils";
import { ModelUsage } from "./components/ModelUsage";
import { PricingEditor, PricingSummary } from "./components/PricingPanel";
import { SpendBars } from "./components/SpendBars";
import { TraceList } from "./components/TraceList";
import { TraceSidebar } from "./components/TraceSidebar";
import { UsageCharts } from "./components/UsageCharts";

const compactOrDash = (value: number | undefined) =>
  value != null ? formatCompact(value) : "—";

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
    costSource,
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

  const collector: { tone: AdminTone; label: string } = health.empty
    ? { tone: "muted", label: "Checking collector…" }
    : collectorOk
      ? { tone: "ok", label: "Collector healthy" }
      : { tone: "danger", label: "Collector down" };

  return (
    <div className="space-y-3.5">
      <PageHeader
        size="md"
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow="AI usage and traces from the QEngine OTLP collector"
        title={
          <>
            QEngine,{" "}
            <span className="font-serif text-[var(--warm)]">under the hood</span>
          </>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <AdminStatusPill tone={collector.tone} live={collector.tone === "ok"}>
              {collector.label}
            </AdminStatusPill>
            {!health.empty && !collectorOk && collectorError ? (
              <span className="text-[var(--danger)]">{collectorError}</span>
            ) : null}
          </span>
        }
        actions={
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            options={TIME_RANGES.map((r) => ({ value: r, label: r }))}
          />
        }
      />

      <ResourceStatus
        failed={usage.failed}
        empty={usage.empty}
        loading={
          <>
            <SkeletonStatGrid count={3} />
            <SkeletonStatGrid count={3} className="mt-3.5" />
          </>
        }
        error={
          <p className="text-sm text-[var(--muted)]">
            Usage unavailable: {(usage.error as Error)?.message}
          </p>
        }
      >
        <div className="space-y-3.5">
          <Panel
            variant="accent"
            wrapperClassName="q-in"
            className="flex flex-wrap items-end gap-6 px-6 py-[22px]"
          >
            <div className="min-w-0 flex-[1_1_240px]">
              <h2 className="label-mono text-[var(--warm)]">
                {costSource === "reported" ? "Cost" : "Est. cost"} · {range}
              </h2>
              <p className="mt-2 text-[64px] font-extralight leading-none tracking-[-0.04em]">
                {pricingConfigured ? formatUsd(costUsd) : "—"}
              </p>
              <p className="mt-2.5 text-[13px] text-[var(--muted)]">
                <span className="text-[var(--ink)]">
                  {requestCount != null ? requestCount.toLocaleString() : "—"}
                </span>{" "}
                requests
                {pricingConfigured && avgCost != null
                  ? ` · ${formatUsd(avgCost)} each`
                  : null}
              </p>
              {costSourceHint(pricingConfigured, costSource) ? (
                <p className="mt-1 text-xs text-[var(--faint)]">
                  {costSourceHint(pricingConfigured, costSource)}
                </p>
              ) : null}
            </div>
            <SpendBars
              values={series.map((p) =>
                pricingConfigured ? p.cost_usd : p.request_count,
              )}
              label={pricingConfigured ? "Cost per interval" : "Requests per interval"}
            />
          </Panel>

          <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            {[
              ["Input tokens", compactOrDash(inputTokens)],
              ["Output tokens", compactOrDash(outputTokens)],
              ["Total tokens", compactOrDash(totalTokens)],
              ["Cost / 1M", pricingConfigured ? formatUsd(costPer1m) : "—"],
              ["Cached", formatCompact(cachedTokens ?? 0)],
              ["Reasoning", formatCompact(reasoningTokens ?? 0)],
            ].map(([label, value], i) => (
              <AdminStat
                key={label}
                label={label}
                value={value}
                size="md"
                index={i + 2}
              />
            ))}
          </section>
        </div>
      </ResourceStatus>

      <UsageCharts
        usage={usage}
        series={series}
        pricingConfigured={pricingConfigured}
        usageGranularity={usageGranularity}
      />

      <div className="flex flex-wrap gap-3.5">
        <ModelUsage
          modelRows={modelRows}
          pricingConfigured={pricingConfigured}
        />
        <PricingSummary
          pricing={pricing}
          pricingOpen={pricingOpen}
          setPricingOpen={setPricingOpen}
          pricingRows={pricingRows}
        />
      </div>

      {pricingOpen ? (
        <PricingEditor
          pricing={pricing}
          pricingRows={pricingRows}
          updatePricingRow={updatePricingRow}
          newModel={newModel}
          setNewModel={setNewModel}
          setPricingDraft={setPricingDraft}
          pricingDraft={pricingDraft}
          savePricing={savePricing}
        />
      ) : null}

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
