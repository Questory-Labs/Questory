import { describe, expect, it } from "vitest";
import type { LlmBudgetModel, LlmBudgetStatus } from "@/lib/enterprise-api";
import {
  budgetBannerLines,
  budgetDraftFrom,
  modelForecast,
  parseBudgetDraft,
} from "./enterprise.telemetry.budget";

const model = (patch: Partial<LlmBudgetModel> = {}): LlmBudgetModel => ({
  model: "vendor/a",
  budgetUsd: 5,
  requests: 1,
  inputTokens: 1,
  outputTokens: 1,
  totalTokens: 2,
  costUsd: 1,
  burnPerDayUsd: 1,
  projectedUsd: 2,
  willOvershoot: false,
  overshootOn: null,
  exhausted: false,
  stopped: false,
  priced: true,
  ...patch,
});

const status = (patch: Partial<LlmBudgetStatus> = {}): LlmBudgetStatus => ({
  settings: { period: "monthly", totalUsd: 10, models: {} },
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  total: {
    budgetUsd: 10,
    spentUsd: 1,
    remainingUsd: 9,
    burnPerDayUsd: 1,
    projectedUsd: 5,
    willOvershoot: false,
    overshootOn: null,
    exhausted: false,
  },
  models: [],
  trend: [],
  blocks: [],
  ...patch,
});

describe("parseBudgetDraft", () => {
  it("round-trips settings and treats blank as no budget", () => {
    const draft = budgetDraftFrom({ period: "weekly", totalUsd: 10, models: { a: 2 } });
    expect(parseBudgetDraft({ ...draft, models: { ...draft.models, b: " " } })).toEqual({
      settings: { period: "weekly", totalUsd: 10, models: { a: 2 } },
    });
    expect(parseBudgetDraft({ period: "monthly", total: "", models: {} })).toEqual({
      settings: { period: "monthly", totalUsd: null, models: {} },
    });
  });

  it("rejects a model budget above the total, but not a sum above it", () => {
    expect(
      parseBudgetDraft({ period: "monthly", total: "5", models: { a: "6" } }),
    ).toEqual({ error: "Budget for a cannot exceed the total budget." });
    expect(
      parseBudgetDraft({ period: "monthly", total: "5", models: { a: "4", b: "4" } }),
    ).toHaveProperty("settings");
  });

  it("rejects negative amounts", () => {
    expect(parseBudgetDraft({ period: "monthly", total: "-1", models: {} })).toHaveProperty(
      "error",
    );
  });
});

describe("modelForecast", () => {
  it("labels each state", () => {
    expect(modelForecast(model({ exhausted: true })).label).toBe("Stopped");
    expect(modelForecast(model({ stopped: true, budgetUsd: null })).label).toBe("Stopped");
    expect(modelForecast(model({ budgetUsd: null })).label).toBe("No cap");
    expect(
      modelForecast(model({ willOvershoot: true, overshootOn: "2026-11-21" })).tone,
    ).toBe("warn");
    expect(modelForecast(model()).label).toBe("On track");
  });
});

describe("budgetBannerLines", () => {
  it("stays quiet with no stop", () => {
    expect(budgetBannerLines(status())).toEqual([]);
  });

  it("does not raise the banner for a forecast alone", () => {
    const base = status();
    expect(
      budgetBannerLines({
        ...base,
        total: { ...base.total, willOvershoot: true },
        models: [model({ willOvershoot: true })],
      }),
    ).toEqual([]);
  });

  it("names exhausted budgets and stopped models once", () => {
    const base = status();
    expect(
      budgetBannerLines({
        ...base,
        total: { ...base.total, exhausted: true },
        models: [model({ exhausted: true })],
        blocks: [
          { reason: "total", model: "vendor/a", count: 2, lastAtMs: 1 },
          { reason: "model", model: "vendor/a", count: 1, lastAtMs: 1 },
          { reason: "unpriced", model: "vendor/b", count: 1, lastAtMs: 1 },
        ],
      }),
    ).toEqual([
      "Total budget reached.",
      "vendor/a reached its budget.",
      "vendor/b is stopped because no rate is known. Add one in Model pricing.",
    ]);
  });

  it("reports a ledger stop", () => {
    expect(
      budgetBannerLines(
        status({ blocks: [{ reason: "ledger", model: "", count: 0, lastAtMs: 1 }] }),
      ),
    ).toEqual(["Spend ledger is unavailable, so paid calls are stopped."]);
  });
});
