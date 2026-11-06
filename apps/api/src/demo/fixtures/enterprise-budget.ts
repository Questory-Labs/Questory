import { dayKey, DEMO_MODELS, ONE_DAY_MS } from "./enterprise-shared";

const TOTAL_BUDGET_USD = 75;
const CAP_GUARD = 0.92;

const BUDGET_MODELS: readonly {
  model: string;
  budgetUsd: number | null;
  dailyUsd: number;
  usdPerRequest: number;
  inputPerRequest: number;
  outputPerRequest: number;
}[] = [
  {
    model: DEMO_MODELS.reason,
    budgetUsd: 50,
    dailyUsd: 1.4,
    usdPerRequest: 0.02,
    inputPerRequest: 6200,
    outputPerRequest: 540,
  },
  {
    model: DEMO_MODELS.write,
    budgetUsd: 8,
    dailyUsd: 0.32,
    usdPerRequest: 0.0036,
    inputPerRequest: 3100,
    outputPerRequest: 420,
  },
  {
    model: DEMO_MODELS.fast,
    budgetUsd: null,
    dailyUsd: 0.04,
    usdPerRequest: 0.00033,
    inputPerRequest: 1800,
    outputPerRequest: 140,
  },
  {
    model: DEMO_MODELS.embed,
    budgetUsd: null,
    dailyUsd: 0.0013,
    usdPerRequest: 0.000018,
    inputPerRequest: 900,
    outputPerRequest: 0,
  },
];

function money(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function spentThrough(
  row: (typeof BUDGET_MODELS)[number],
  day: number,
): number {
  const spent = row.dailyUsd * day;
  return row.budgetUsd === null
    ? spent
    : Math.min(spent, row.budgetUsd * CAP_GUARD);
}

function forecast(
  spent: number,
  budgetUsd: number | null,
  elapsedDays: number,
  remainingDays: number,
  now: number,
) {
  const burn = spent / Math.max(elapsedDays, 1);
  const projected = spent + burn * remainingDays;
  const willOvershoot = budgetUsd !== null && projected > budgetUsd;
  const exhausted = budgetUsd !== null && spent >= budgetUsd;
  const overshootOn =
    budgetUsd !== null && willOvershoot && !exhausted
      ? dayKey(now + Math.ceil(((budgetUsd - spent) / burn) * 24) * 3_600_000)
      : null;
  return { burn, projected, willOvershoot, overshootOn, exhausted };
}

export function llmBudget() {
  const now = Date.now();
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  const daysInPeriod = Math.round((nextMonth - start) / ONE_DAY_MS);
  const elapsedDays = date.getUTCDate();
  const remainingDays = daysInPeriod - elapsedDays;

  const totalSpentOn = (day: number) =>
    BUDGET_MODELS.reduce((sum, row) => sum + spentThrough(row, day), 0);
  const spent = totalSpentOn(elapsedDays);
  const total = forecast(
    spent,
    TOTAL_BUDGET_USD,
    elapsedDays,
    remainingDays,
    now,
  );

  const models = BUDGET_MODELS.map((row) => {
    const modelSpent = spentThrough(row, elapsedDays);
    const outlook = forecast(
      modelSpent,
      row.budgetUsd,
      elapsedDays,
      remainingDays,
      now,
    );
    const requests = Math.round(modelSpent / row.usdPerRequest);
    const inputTokens = requests * row.inputPerRequest;
    const outputTokens = requests * row.outputPerRequest;
    return {
      model: row.model,
      budgetUsd: row.budgetUsd,
      requests,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd: money(modelSpent),
      burnPerDayUsd: money(outlook.burn),
      projectedUsd: money(outlook.projected),
      willOvershoot: outlook.willOvershoot,
      overshootOn: outlook.overshootOn,
      exhausted: outlook.exhausted,
      stopped: false,
      priced: true,
    };
  });

  const trend = Array.from({ length: daysInPeriod }, (_, offset) => {
    const day = offset + 1;
    const ahead = day - elapsedDays;
    return {
      day: dayKey(start + offset * ONE_DAY_MS),
      spentUsd: ahead <= 0 ? money(totalSpentOn(day)) : null,
      projectedUsd: ahead >= 0 ? money(spent + total.burn * ahead) : null,
    };
  });

  return {
    settings: {
      period: "monthly" as const,
      totalUsd: TOTAL_BUDGET_USD,
      models: Object.fromEntries(
        BUDGET_MODELS.flatMap((row) =>
          row.budgetUsd === null ? [] : [[row.model, row.budgetUsd]],
        ),
      ),
    },
    periodStart: dayKey(start),
    periodEnd: dayKey(nextMonth - ONE_DAY_MS),
    total: {
      budgetUsd: TOTAL_BUDGET_USD,
      spentUsd: money(spent),
      remainingUsd: money(TOTAL_BUDGET_USD - spent),
      burnPerDayUsd: money(total.burn),
      projectedUsd: money(total.projected),
      willOvershoot: total.willOvershoot,
      overshootOn: total.overshootOn,
      exhausted: total.exhausted,
    },
    models,
    trend,
    blocks: [],
  };
}
