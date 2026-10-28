"use client";

import { LineChart } from "@/components/charts/LineChart";
import {
  ADMIN_ROW,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
} from "@/modules/admin/shared/admin.styles";
import type { TelemetryModelRow } from "../enterprise.telemetry.types";
import {
  formatCompact,
  formatDurationNs,
  formatUsd,
} from "../enterprise.telemetry.utils";

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
    <section
      aria-labelledby="telemetry-models"
      className="panel q-in min-w-0 flex-[3_1_520px] px-1.5 pb-1.5 pt-[18px]"
      style={{ "--i": 9 } as React.CSSProperties}
    >
      <h2 id="telemetry-models" className={`mx-3.5 mb-1.5 ${ADMIN_SECTION_TITLE}`}>
        By model
      </h2>
      <div className="overflow-x-auto">
        <table className={`${ADMIN_TABLE} min-w-[560px]`}>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH}>
                Model
              </th>
              <th scope="col" className={`${ADMIN_TH} text-right`}>
                Requests
              </th>
              <th scope="col" className={`${ADMIN_TH} text-right`}>
                Tokens in / out
              </th>
              <th scope="col" className={`${ADMIN_TH} text-right`}>
                {pricingConfigured ? "Cost" : "Tokens"}
              </th>
            </tr>
          </thead>
          <tbody>
            {modelRows.map((row) => (
              <tr key={row.model} className={ADMIN_ROW}>
                <td className={`${ADMIN_TD} font-mono text-[13px]`}>
                  <span className="break-all">{row.model}</span>
                  {!row.priced && pricingConfigured ? (
                    <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--warn)]">
                      no rate
                    </span>
                  ) : null}
                </td>
                <td className={`${ADMIN_TD} text-right font-mono text-[13px] tabular-nums`}>
                  {row.request_count.toLocaleString()}
                  {row.avg_duration_ns != null ? (
                    <div className="text-[11px] text-[var(--muted)]">
                      avg {formatDurationNs(row.avg_duration_ns)}
                    </div>
                  ) : null}
                </td>
                <td className={`${ADMIN_TD} text-right font-mono text-xs text-[var(--muted)]`}>
                  {formatCompact(row.input_tokens)} /{" "}
                  {formatCompact(row.output_tokens)}
                  {row.cached_tokens > 0 || row.reasoning_tokens > 0 ? (
                    <div className="text-[11px] text-[var(--faint)]">
                      {formatCompact(row.cached_tokens)} cached ·{" "}
                      {formatCompact(row.reasoning_tokens)} reason
                    </div>
                  ) : null}
                </td>
                <td className={`${ADMIN_TD} text-right text-[var(--warm)]`}>
                  {pricingConfigured
                    ? formatUsd(row.cost_usd)
                    : row.total_tokens.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3.5 pb-2 pt-4">
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
      </div>
    </section>
  );
};
