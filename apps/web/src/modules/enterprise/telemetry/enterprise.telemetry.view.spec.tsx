import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  ResourceProvider,
  ResourceStore,
  type UseActionResult,
  type UseResourceResult,
} from "@questorylabs/qhttp/react";
import type {
  OtelHealth,
  OtelModelPricing,
  OtelPricing,
  OtelTracesPage,
  OtelUsage,
} from "@/lib/enterprise-api";
import { TelemetryView } from "./enterprise.telemetry.view";
import type { TelemetryViewProps } from "./enterprise.telemetry.types";

vi.mock("@/components/charts/LineChart", () => ({
  LineChart: () => <div>line-chart</div>,
}));

vi.mock("@/components/charts/MultiLineChart", () => ({
  MultiLineChart: () => <div>multi-line-chart</div>,
}));

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const idleAction = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as unknown as UseActionResult<OtelPricing, OtelModelPricing[]>;

const usageValue: OtelUsage = {
  request_count: 12,
  input_tokens: 100,
  output_tokens: 40,
  total_tokens: 140,
  pricing_configured: false,
  timeseries: [],
  by_model: [],
};

const baseProps = (): TelemetryViewProps => ({
  enabled: true,
  enterpriseLoading: false,
  range: "24h",
  setRange: () => undefined,
  page: 0,
  setPage: () => undefined,
  selectedTraceId: null,
  setSelectedTraceId: () => undefined,
  health: resource<OtelHealth>({
    empty: false,
    failed: false,
    value: { available: true, ok: true },
  }),
  usage: resource<OtelUsage>({
    empty: false,
    failed: false,
    value: usageValue,
  }),
  pricing: resource<OtelPricing>({
    empty: false,
    failed: false,
    value: { models: [] },
  }),
  traces: resource<OtelTracesPage>({
    empty: false,
    failed: false,
    value: { traces: [], total: 0, limit: 15, offset: 0 },
  }),
  savePricing: idleAction,
  pricingOpen: false,
  setPricingOpen: () => undefined,
  newModel: "",
  setNewModel: () => undefined,
  pricingDraft: null,
  setPricingDraft: () => undefined,
  updatePricingRow: () => undefined,
  pricingRows: [],
  series: [],
  modelRows: [],
  inputTokens: 100,
  outputTokens: 40,
  cachedTokens: 0,
  reasoningTokens: 0,
  totalTokens: 140,
  requestCount: 12,
  costUsd: undefined,
  avgCost: undefined,
  costPer1m: undefined,
  pricingConfigured: false,
  collectorOk: true,
  collectorError: null,
  totalTraces: 0,
  totalPages: 1,
});

const renderView = (patch: Partial<TelemetryViewProps> = {}) => {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <TelemetryView
        {...({ ...baseProps(), ...patch } as TelemetryViewProps)}
      />
    </ResourceProvider>,
  );
};

describe("TelemetryView", () => {
  afterEach(cleanup);

  it("shows a gate while QEngine status is loading", () => {
    renderView({ enterpriseLoading: true });
    expect(screen.getByText("Checking QEngine…")).toBeInTheDocument();
  });

  it("shows unavailable copy when QEngine is off", () => {
    renderView({ enabled: false });
    expect(
      screen.getByText("QEngine telemetry is not available on this instance."),
    ).toBeInTheDocument();
  });

  it("shows skeletons when usage is empty", () => {
    renderView({
      usage: resource<OtelUsage>({ empty: true, failed: false }),
    });
    expect(screen.getByText("Telemetry")).toBeInTheDocument();
    expect(screen.queryByText("Requests")).not.toBeInTheDocument();
  });

  it("shows an error when usage failed, even if empty", () => {
    renderView({
      usage: resource<OtelUsage>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Usage unavailable: fail")).toBeInTheDocument();
    expect(screen.queryByText("Requests")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("shows collection empty for traces", () => {
    renderView();
    expect(
      screen.getByText("No traces yet. Run a curation job with OTLP export enabled."),
    ).toBeInTheDocument();
  });
});
