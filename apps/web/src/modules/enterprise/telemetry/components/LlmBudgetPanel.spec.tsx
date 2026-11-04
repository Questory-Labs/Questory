import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type { LlmBudgetSettings, LlmBudgetStatus } from "@/lib/enterprise-api";
import { LlmBudgetPanel } from "./LlmBudgetPanel";

vi.mock("@/components/charts/MultiLineChart", () => ({
  MultiLineChart: ({ series }: { series: { name: string }[] }) => (
    <div>{series.map((s) => s.name).join(",")}</div>
  ),
}));

const status: LlmBudgetStatus = {
  settings: { period: "monthly", totalUsd: 10, models: { "vendor/a": 4 } },
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  total: {
    budgetUsd: 10,
    spentUsd: 3,
    remainingUsd: 7,
    burnPerDayUsd: 1,
    projectedUsd: 30,
    willOvershoot: true,
    overshootOn: "2026-11-11",
    exhausted: false,
  },
  models: [
    {
      model: "vendor/a",
      budgetUsd: 4,
      requests: 12,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      costUsd: 3,
      burnPerDayUsd: 1,
      projectedUsd: 30,
      willOvershoot: true,
      overshootOn: "2026-11-05",
      exhausted: false,
      stopped: false,
      priced: true,
    },
  ],
  trend: [
    { day: "2026-11-01", spentUsd: 3, projectedUsd: 3 },
    { day: "2026-11-02", spentUsd: null, projectedUsd: 4 },
  ],
  blocks: [],
};

const budget = {
  value: status,
  failed: false,
  empty: false,
  error: null,
} as unknown as UseResourceResult<LlmBudgetStatus>;

const action = (submitAsync = vi.fn(async () => status)) =>
  ({
    submitAsync,
    busy: false,
    failed: false,
    error: null,
  }) as unknown as UseActionResult<LlmBudgetStatus, LlmBudgetSettings>;

describe("LlmBudgetPanel", () => {
  afterEach(cleanup);

  it("shows the trend series, table, and overshoot forecast", () => {
    render(<LlmBudgetPanel budget={budget} save={action()} />);
    expect(screen.getByText("Spent,Projected,Budget")).toBeTruthy();
    expect(screen.getByText("vendor/a")).toBeTruthy();
    expect(screen.getByText("1.0k / 500")).toBeTruthy();
    expect(screen.getByText(/Would hit cap/)).toBeTruthy();
    expect(screen.getByText("Would reach budget early")).toBeTruthy();
  });

  it("blocks saving a model budget above the total", () => {
    const submit = vi.fn(async () => status);
    render(<LlmBudgetPanel budget={budget} save={action(submit)} />);
    fireEvent.change(screen.getByLabelText("Budget for vendor/a"), {
      target: { value: "11" },
    });
    expect(screen.getByRole("alert").textContent).toContain("cannot exceed");
    const save = screen.getByRole("button", { name: "Save budget" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(submit).not.toHaveBeenCalled();
  });

  it("saves edited settings", async () => {
    const submit = vi.fn(async () => status);
    render(<LlmBudgetPanel budget={budget} save={action(submit)} />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    fireEvent.change(screen.getByPlaceholderText("No limit"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save budget" }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        period: "weekly",
        totalUsd: 20,
        models: { "vendor/a": 4 },
      }),
    );
  });

  it("shows the server's rejection", () => {
    const failed = {
      ...action(),
      failed: true,
      error: new Error("budget for x cannot exceed the total budget"),
    } as unknown as UseActionResult<LlmBudgetStatus, LlmBudgetSettings>;
    render(<LlmBudgetPanel budget={budget} save={failed} />);
    expect(screen.getByRole("alert").textContent).toContain("budget for x");
  });
});
