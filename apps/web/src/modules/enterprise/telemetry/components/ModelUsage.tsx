"use client";

import { LineChart } from "@/components/charts/LineChart";
import type { TelemetryModelRow } from "../enterprise.telemetry.types";
import {
  formatCompact,
  formatDurationNs,
  formatUsd,
} from "../enterprise.telemetry.utils";
import { TitledPanel } from "./TelemetryChrome";

type ModelUsageProps = {
  modelRows: TelemetryModelRow[];
  pricingConfigured: boolean;
};

export const ModelUsage = ({
  modelRows,
  pricingConfigured,
}: ModelUsageProps) => {
  if (modelRows.length === 0) return null;

  return (
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
                  {!row.priced && pricingConfigured ? " · no rate" : null}
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
  );
};
