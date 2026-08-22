import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type {
  OtelHealth,
  OtelModelPricing,
  OtelPricing,
  OtelSpan,
  OtelTracesPage,
  OtelUsage,
  OtelUsageBucket,
} from "@/lib/enterprise-api";
import { TIME_RANGES } from "./enterprise.telemetry.constants";

export type TimeRange = (typeof TIME_RANGES)[number];

export type SpanNode = {
  span: OtelSpan;
  depth: number;
  children: SpanNode[];
};

export type TelemetryModelRow = {
  model: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
  avg_duration_ns?: number;
  cost_usd: number;
  priced: boolean;
};

export type TelemetrySeriesPoint = OtelUsageBucket & {
  label: string;
  cost_usd: number;
};

export type TelemetryViewProps = {
  enabled: boolean;
  enterpriseLoading: boolean;
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  page: number;
  setPage: (page: number) => void;
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  health: UseResourceResult<OtelHealth>;
  usage: UseResourceResult<OtelUsage>;
  pricing: UseResourceResult<OtelPricing>;
  traces: UseResourceResult<OtelTracesPage>;
  savePricing: UseActionResult<OtelPricing, OtelModelPricing[]>;
  pricingOpen: boolean;
  setPricingOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  newModel: string;
  setNewModel: (value: string) => void;
  pricingDraft: OtelModelPricing[] | null;
  setPricingDraft: (
    value:
      | OtelModelPricing[]
      | null
      | ((prev: OtelModelPricing[] | null) => OtelModelPricing[] | null),
  ) => void;
  updatePricingRow: (
    index: number,
    field: keyof OtelModelPricing,
    value: string,
  ) => void;
  pricingRows: OtelModelPricing[];
  series: TelemetrySeriesPoint[];
  modelRows: TelemetryModelRow[];
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  cachedTokens: number | undefined;
  reasoningTokens: number | undefined;
  totalTokens: number | undefined;
  requestCount: number | undefined;
  costUsd: number | undefined;
  avgCost: number | undefined;
  costPer1m: number | undefined;
  pricingConfigured: boolean;
  collectorOk: boolean;
  collectorError: string | null;
  totalTraces: number;
  totalPages: number;
  usageGranularity?: string;
};
