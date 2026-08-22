"use client";

import { useMemo } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { formatMoney } from "@/lib/money";
import { Panel } from "@questorylabs/ui";

export const SpendChart = ({
  title,
  data,
  currency,
}: {
  title: string;
  data: { name: string; amount: number }[];
  currency: string;
}) => {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.amount - a.amount)
        .map((row) => ({ label: row.name, value: row.amount })),
    [data],
  );

  return (
    <Panel className="p-4">
      <h2 className="mb-4 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <BarChart
          data={chartData}
          ariaLabel={title}
          valueLabel="value"
          size="lg"
          formatValue={(n) => formatMoney(n, currency)}
          formatYTick={(n) => formatMoney(n, currency, { compact: true })}
        />
      )}
    </Panel>
  );
};
