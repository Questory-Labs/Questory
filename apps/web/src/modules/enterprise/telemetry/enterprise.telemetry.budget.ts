import type {
  LlmBudgetBlock,
  LlmBudgetModel,
  LlmBudgetPeriod,
  LlmBudgetSettings,
  LlmBudgetStatus,
} from "@/lib/enterprise-api";
import type { AdminTone } from "@/modules/admin/shared/admin.tone";
import { shortDate } from "@/components/charts/chart-utils";

export type LlmBudgetDraft = {
  period: LlmBudgetPeriod;
  total: string;
  models: Record<string, string>;
};

export const budgetDraftFrom = (settings: LlmBudgetSettings): LlmBudgetDraft => ({
  period: settings.period,
  total: settings.totalUsd != null ? String(settings.totalUsd) : "",
  models: Object.fromEntries(
    Object.entries(settings.models).map(([model, cap]) => [model, String(cap)]),
  ),
});

const parseAmount = (raw: string): number | null => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const parseBudgetDraft = (
  draft: LlmBudgetDraft,
): { settings: LlmBudgetSettings } | { error: string } => {
  let totalUsd: number | null = null;
  if (draft.total.trim() !== "") {
    totalUsd = parseAmount(draft.total);
    if (totalUsd == null) return { error: "Total budget must be zero or more." };
  }
  const models: Record<string, number> = {};
  for (const [model, raw] of Object.entries(draft.models)) {
    if (raw.trim() === "") continue;
    const cap = parseAmount(raw);
    if (cap == null) return { error: `Budget for ${model} must be zero or more.` };
    if (totalUsd != null && cap > totalUsd) {
      return { error: `Budget for ${model} cannot exceed the total budget.` };
    }
    models[model] = cap;
  }
  return { settings: { period: draft.period, totalUsd, models } };
};

export const modelForecast = (
  row: LlmBudgetModel,
): { tone: AdminTone; label: string } => {
  if (row.exhausted || row.stopped) return { tone: "danger", label: "Stopped" };
  if (row.budgetUsd == null) return { tone: "muted", label: "No cap" };
  if (row.willOvershoot) {
    return {
      tone: "warn",
      label: row.overshootOn
        ? `Would hit cap ${shortDate(row.overshootOn)}`
        : "Would hit cap",
    };
  }
  return { tone: "ok", label: "On track" };
};

const blockLine = ({ reason, model }: LlmBudgetBlock): string => {
  switch (reason) {
    case "total":
      return "Total budget has no room for another call.";
    case "model":
      return `${model} reached its budget.`;
    case "unpriced":
      return `${model} is stopped because no rate is known. Add one in Model pricing.`;
    default:
      return "Spend ledger is unavailable, so paid calls are stopped.";
  }
};

export const budgetBannerLines = (status: LlmBudgetStatus): string[] => {
  const lines = new Set<string>();
  if (status.total.exhausted) lines.add("Total budget reached.");
  for (const block of status.blocks) {
    if (block.reason === "total" && status.total.exhausted) continue;
    lines.add(blockLine(block));
  }
  for (const row of status.models) {
    if (row.exhausted) lines.add(`${row.model} reached its budget.`);
  }
  return [...lines];
};
