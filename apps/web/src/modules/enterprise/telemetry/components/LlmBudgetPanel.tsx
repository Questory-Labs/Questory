"use client";

import { MultiLineChart } from "@/components/charts/MultiLineChart";
import type { SeriesConfig } from "@/components/charts/types";
import { SegmentedControl } from "@/components/SegmentedControl";
import type {
  LlmBudgetPeriod,
  LlmBudgetSettings,
  LlmBudgetStatus,
} from "@/lib/enterprise-api";
import { ADMIN_SECTION_TITLE } from "@/modules/admin/shared/admin.styles";
import { AdminStatusPill } from "@/modules/admin/shared/components/AdminStatusPill";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { Button, ResourceStatus } from "@questorylabs/ui";
import { useMemo, useState } from "react";
import {
  budgetDraftFrom,
  parseBudgetDraft,
  type LlmBudgetDraft,
} from "../enterprise.telemetry.budget";
import { COLOR_COST, COLOR_TOTAL } from "../enterprise.telemetry.constants";
import { formatUsd } from "../enterprise.telemetry.utils";
import { LlmBudgetTable } from "./LlmBudgetTable";
import { MiniStat } from "./TelemetryChrome";

const PERIODS: readonly { value: LlmBudgetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const totalForecast = (status: LlmBudgetStatus) => {
  const { total } = status;
  if (total.budgetUsd == null) return { tone: "muted", label: "No total budget" } as const;
  if (total.exhausted) return { tone: "danger", label: "Budget reached" } as const;
  if (total.willOvershoot) return { tone: "warn", label: "Would reach budget early" } as const;
  return { tone: "ok", label: "On track" } as const;
};

const Loaded = ({
  status,
  save,
}: {
  status: LlmBudgetStatus;
  save: UseActionResult<LlmBudgetStatus, LlmBudgetSettings>;
}) => {
  const [edits, setEdits] = useState<LlmBudgetDraft | null>(null);
  const draft = edits ?? budgetDraftFrom(status.settings);
  const parsed = parseBudgetDraft(draft);
  const validation = "error" in parsed ? parsed.error : null;
  const budgetUsd = status.total.budgetUsd;

  const trend = useMemo(
    () =>
      status.trend.map((point) => ({
        label: point.day,
        spent: point.spentUsd,
        projected: point.projectedUsd,
        ...(budgetUsd != null ? { budget: budgetUsd } : {}),
      })),
    [status.trend, budgetUsd],
  );
  const series = useMemo<SeriesConfig[]>(
    () => [
      { key: "spent", name: "Spent", color: COLOR_COST, skipMissing: true },
      {
        key: "projected",
        name: "Projected",
        color: COLOR_COST,
        strokeDasharray: "5 5",
        skipMissing: true,
      },
      ...(budgetUsd != null
        ? [{ key: "budget", name: "Budget", color: COLOR_TOTAL, strokeDasharray: "2 3" }]
        : []),
    ],
    [budgetUsd],
  );
  const yAxes = useMemo(
    () => [
      { id: "default", side: "left" as const, fractional: true, formatTick: formatUsd },
    ],
    [],
  );

  const onSave = async () => {
    if ("error" in parsed) return;
    await save.submitAsync(parsed.settings);
    setEdits(null);
  };

  const forecast = totalForecast(status);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="label-mono mb-1.5">Period</p>
          <SegmentedControl
            label="Budget period"
            value={draft.period}
            onChange={(period) => setEdits({ ...draft, period })}
            options={PERIODS}
          />
        </div>
        <label className="block">
          <span className="label-mono mb-1.5 block">Total budget (USD)</span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="No limit"
            value={draft.total}
            onChange={(event) => setEdits({ ...draft, total: event.target.value })}
            className="w-36 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-xs text-[var(--ink)]"
          />
        </label>
        <Button
          variant="primary"
          disabled={!edits || validation != null || save.busy}
          onClick={() => void onSave().catch(() => undefined)}
        >
          {save.busy ? "Saving…" : "Save budget"}
        </Button>
        {edits ? (
          <Button variant="ghost" onClick={() => setEdits(null)} disabled={save.busy}>
            Discard
          </Button>
        ) : null}
      </div>
      {validation || save.failed ? (
        <p role="alert" className="text-[13px] text-[var(--danger)]">
          {validation ?? (save.error as Error | null)?.message ?? "Could not save the budget."}
        </p>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
        <MiniStat label="Spent" value={formatUsd(status.total.spentUsd)} />
        <MiniStat
          label="Remaining"
          value={status.total.remainingUsd != null ? formatUsd(status.total.remainingUsd) : "—"}
        />
        <MiniStat label="Burn / day" value={formatUsd(status.total.burnPerDayUsd)} />
        <MiniStat label="Projected" value={formatUsd(status.total.projectedUsd)} />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-normal">
            Cumulative spend, {status.periodStart} to {status.periodEnd} UTC
          </h3>
          <AdminStatusPill tone={forecast.tone}>{forecast.label}</AdminStatusPill>
        </div>
        <MultiLineChart
          data={trend}
          series={series}
          yAxes={yAxes}
          size="md"
          ariaLabel="Cumulative LLM spend and projection for this budget period"
          formatValue={formatUsd}
        />
      </div>

      <LlmBudgetTable
        rows={status.models}
        caps={draft.models}
        onCapChange={(model, value) =>
          setEdits({ ...draft, models: { ...draft.models, [model]: value } })
        }
      />
    </div>
  );
};

export const LlmBudgetPanel = ({
  budget,
  save,
}: {
  budget: UseResourceResult<LlmBudgetStatus>;
  save: UseActionResult<LlmBudgetStatus, LlmBudgetSettings>;
}) => (
  <section
    id="llm-budget"
    aria-labelledby="telemetry-llm-budget"
    className="panel q-in min-w-0 scroll-mt-6 px-5 py-[18px]"
    style={{ "--i": 8 } as React.CSSProperties}
  >
    <h2 id="telemetry-llm-budget" className={ADMIN_SECTION_TITLE}>
      LLM budget
    </h2>
    <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">
      A call is skipped if its worst-case cost would cross a budget. Each model budget must fit
      within the total.
    </p>
    <ResourceStatus
      failed={budget.failed}
      empty={budget.empty}
      loading={<p className="text-sm text-[var(--muted)]">Loading budget…</p>}
      error={
        <p className="text-sm text-[var(--danger)]">
          Budget unavailable: {(budget.error as Error | null)?.message}
        </p>
      }
    >
      {budget.value ? <Loaded status={budget.value} save={save} /> : null}
    </ResourceStatus>
  </section>
);
