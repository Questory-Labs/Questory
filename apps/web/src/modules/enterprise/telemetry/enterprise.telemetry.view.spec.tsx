import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  costSource: undefined,
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
    expect(screen.getByText("under the hood")).toBeInTheDocument();
    expect(screen.queryByText("Input tokens")).not.toBeInTheDocument();
  });

  it("shows an error when usage failed, even if empty", () => {
    renderView({
      usage: resource<OtelUsage>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Usage unavailable: fail")).toBeInTheDocument();
    expect(screen.queryByText("Input tokens")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByText("Input tokens")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Collector healthy")).toBeInTheDocument();
  });

  it("labels provider-reported cost", () => {
    renderView({ pricingConfigured: true, costSource: "reported", costUsd: 0.25 });
    expect(screen.getByText("Cost · 24h")).toBeInTheDocument();
    expect(screen.getByText("$0.2500")).toBeInTheDocument();
    expect(screen.getByText("Reported by the provider")).toBeInTheDocument();
  });

  it("shows collection empty for traces", () => {
    renderView();
    expect(
      screen.getByText("No traces yet. Run a curation job with OTLP export enabled."),
    ).toBeInTheDocument();
  });

  it("shows the collector as down with its error", () => {
    renderView({ collectorOk: false, collectorError: "connection refused" });
    expect(screen.getByText("Collector down")).toBeInTheDocument();
    expect(screen.getByText("connection refused")).toBeInTheDocument();
  });

  it("switches range through the segmented control", () => {
    const setRange = vi.fn();
    renderView({ setRange });
    const button = screen.getByRole("button", { name: "7d" });
    fireEvent.click(button);
    expect(setRange).toHaveBeenCalledWith("7d");
    expect(screen.getByRole("button", { name: "24h" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens the pricing editor from the summary", () => {
    const setPricingOpen = vi.fn();
    renderView({ setPricingOpen });
    fireEvent.click(screen.getByRole("button", { name: "Edit pricing" }));
    expect(setPricingOpen).toHaveBeenCalled();
    expect(screen.queryByText("Save rates")).not.toBeInTheDocument();
  });

  it("renders the pricing editor when open", () => {
    renderView({ pricingOpen: true });
    expect(screen.getByRole("button", { name: "Save rates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close editor" })).toBeInTheDocument();
  });

  it("renders model rows in the by-model table", () => {
    renderView({
      modelRows: [
        {
          model: "gpt-x",
          request_count: 7,
          input_tokens: 1200,
          output_tokens: 300,
          cached_tokens: 0,
          reasoning_tokens: 0,
          total_tokens: 1500,
          cost_usd: 0,
          priced: false,
        },
      ],
    });
    expect(screen.getByText("By model")).toBeInTheDocument();
    expect(screen.getByText("gpt-x")).toBeInTheDocument();
    expect(screen.getByText("1.2k / 300")).toBeInTheDocument();
  });

  it("renders trace rows with a status pill and selects a trace", () => {
    const setSelectedTraceId = vi.fn();
    renderView({
      setSelectedTraceId,
      totalTraces: 1,
      traces: resource<OtelTracesPage>({
        empty: false,
        failed: false,
        value: {
          traces: [
            {
              trace_id: "abcdef1234567890",
              root_span: "recap.monthly",
              status: "OK",
              span_count: 4,
              duration_ns: 2_000_000,
            },
          ],
          total: 1,
          limit: 15,
          offset: 0,
        },
      }),
    });
    expect(screen.getByText("recap.monthly")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "abcdef123456…" }));
    expect(setSelectedTraceId).toHaveBeenCalledWith("abcdef1234567890");
  });
});
