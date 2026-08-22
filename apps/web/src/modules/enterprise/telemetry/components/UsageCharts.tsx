"use client";

import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { StateMessage } from "@/components/ui";
import { ResourceStatus } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { OtelUsage } from "@/lib/enterprise-api";
import {
  COLOR_COST,
  COLOR_INPUT,
  COLOR_OUTPUT,
  COLOR_REQUESTS,
  COLOR_TOTAL,
} from "../enterprise.telemetry.constants";
import type { TelemetrySeriesPoint } from "../enterprise.telemetry.types";
import { formatCompact, formatUsd } from "../enterprise.telemetry.utils";
import { TitledPanel } from "./TelemetryChrome";

type UsageChartsProps = {
  usage: UseResourceResult<OtelUsage>;
  series: TelemetrySeriesPoint[];
  pricingConfigured: boolean;
  usageGranularity?: string;
};

export const UsageCharts = ({
  usage,
  series,
  pricingConfigured,
  usageGranularity,
}: UsageChartsProps) => (
  <section className="grid gap-4 xl:grid-cols-2">
    <TitledPanel title={`Tokens over time (${usageGranularity || "bucket"})`}>
      <ResourceStatus
        failed={usage.failed}
        empty={usage.empty}
        loading={<StateMessage variant="loading" className="mt-0" />}
        error={null}
      >
        {series.length === 0 ? (
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
      </ResourceStatus>
    </TitledPanel>

    <TitledPanel title="Requests & cost over time">
      <ResourceStatus
        failed={usage.failed}
        empty={usage.empty}
        loading={<StateMessage variant="loading" className="mt-0" />}
        error={null}
      >
        {series.length === 0 ? (
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
      </ResourceStatus>
    </TitledPanel>
  </section>
);
