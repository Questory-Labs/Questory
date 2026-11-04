"use client";

import type { LlmBudgetModel } from "@/lib/enterprise-api";
import {
  ADMIN_ROW,
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
} from "@/modules/admin/shared/admin.styles";
import { AdminStatusPill } from "@/modules/admin/shared/components/AdminStatusPill";
import { modelForecast } from "../enterprise.telemetry.budget";
import { formatCompact, formatUsd } from "../enterprise.telemetry.utils";

const NUMERIC = `${ADMIN_TD} whitespace-nowrap text-right font-mono text-xs tabular-nums`;

export const LlmBudgetTable = ({
  rows,
  caps,
  onCapChange,
}: {
  rows: LlmBudgetModel[];
  caps: Record<string, string>;
  onCapChange: (model: string, value: string) => void;
}) => (
  <div className="overflow-x-auto">
    <table className={`${ADMIN_TABLE} min-w-[860px]`}>
      <thead>
        <tr>
          <th scope="col" className={ADMIN_TH}>Model</th>
          <th scope="col" className={`${ADMIN_TH} whitespace-nowrap text-right`}>Tokens in / out</th>
          <th scope="col" className={`${ADMIN_TH} whitespace-nowrap text-right`}>Cost</th>
          <th scope="col" className={`${ADMIN_TH} whitespace-nowrap text-right`}>Budget (USD)</th>
          <th scope="col" className={`${ADMIN_TH} whitespace-nowrap text-right`}>Burn / day</th>
          <th scope="col" className={`${ADMIN_TH} whitespace-nowrap text-right`}>Projected</th>
          <th scope="col" className={ADMIN_TH}>Forecast</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const forecast = modelForecast(row);
          return (
            <tr key={row.model} className={ADMIN_ROW}>
              <td className={`${ADMIN_TD} font-mono text-[13px]`}>
                <span className="break-all">{row.model}</span>
                {!row.priced ? (
                  <span className="ml-2 whitespace-nowrap rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--muted)]">
                    no rate
                  </span>
                ) : null}
                <div className="text-[11px] text-[var(--faint)]">
                  {row.requests.toLocaleString()} requests
                </div>
              </td>
              <td className={NUMERIC}>
                {formatCompact(row.inputTokens)} / {formatCompact(row.outputTokens)}
              </td>
              <td className={NUMERIC}>{formatUsd(row.costUsd)}</td>
              <td className={NUMERIC}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  aria-label={`Budget for ${row.model}`}
                  placeholder="None"
                  value={caps[row.model] ?? ""}
                  onChange={(event) => onCapChange(row.model, event.target.value)}
                  className="w-24 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 text-right font-mono text-xs text-[var(--ink)]"
                />
              </td>
              <td className={NUMERIC}>{formatUsd(row.burnPerDayUsd)}</td>
              <td className={NUMERIC}>{formatUsd(row.projectedUsd)}</td>
              <td className={ADMIN_TD}>
                <AdminStatusPill tone={forecast.tone}>{forecast.label}</AdminStatusPill>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
