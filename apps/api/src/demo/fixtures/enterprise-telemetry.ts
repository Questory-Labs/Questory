import type { DemoRequestContext } from "../demo.types";
import { DEMO_MODELS, ONE_DAY_MS } from "./enterprise-shared";

const HOUR_MS = 60 * 60 * 1000;

export const PRICED_MODELS: readonly {
  model: string;
  input: number;
  output: number;
  cached: number;
  reasoning: number;
  share: number;
  inputPerRequest: number;
  outputPerRequest: number;
  cachedShare: number;
  reasoningShare: number;
  avgDurationNs: number;
}[] = [
  {
    model: DEMO_MODELS.reason,
    input: 3,
    output: 15,
    cached: 0.3,
    reasoning: 15,
    share: 0.2,
    inputPerRequest: 6200,
    outputPerRequest: 540,
    cachedShare: 0.4,
    reasoningShare: 0.3,
    avgDurationNs: 8_400_000_000,
  },
  {
    model: DEMO_MODELS.write,
    input: 0.8,
    output: 4,
    cached: 0.08,
    reasoning: 0,
    share: 0.25,
    inputPerRequest: 3100,
    outputPerRequest: 420,
    cachedShare: 0.25,
    reasoningShare: 0,
    avgDurationNs: 3_100_000_000,
  },
  {
    model: DEMO_MODELS.fast,
    input: 0.15,
    output: 0.6,
    cached: 0.015,
    reasoning: 0,
    share: 0.35,
    inputPerRequest: 1800,
    outputPerRequest: 140,
    cachedShare: 0.1,
    reasoningShare: 0,
    avgDurationNs: 820_000_000,
  },
  {
    model: DEMO_MODELS.embed,
    input: 0.02,
    output: 0,
    cached: 0,
    reasoning: 0,
    share: 0.2,
    inputPerRequest: 900,
    outputPerRequest: 0,
    cachedShare: 0,
    reasoningShare: 0,
    avgDurationNs: 140_000_000,
  },
];

const HOURLY_REQUESTS = [
  6, 4, 3, 2, 2, 3, 5, 8, 11, 14, 16, 18, 21, 19, 17, 20, 24, 29, 34, 38, 41, 33, 22, 12,
] as const;
const DAILY_REQUESTS = [310, 285, 342, 298, 365, 448, 421] as const;

const RANGES: Record<
  string,
  { buckets: number; granularity: "hour" | "day" }
> = {
  "1h": { buckets: 2, granularity: "hour" },
  "6h": { buckets: 6, granularity: "hour" },
  "24h": { buckets: 24, granularity: "hour" },
  "7d": { buckets: 7, granularity: "day" },
  "30d": { buckets: 30, granularity: "day" },
};

type Counts = {
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
  cost_usd: number;
};

const EMPTY_COUNTS: Counts = {
  request_count: 0,
  input_tokens: 0,
  output_tokens: 0,
  cached_tokens: 0,
  reasoning_tokens: 0,
  total_tokens: 0,
  cost_usd: 0,
};

function usageFor(
  row: (typeof PRICED_MODELS)[number],
  bucketRequests: number,
): Counts {
  const requests = Math.round(bucketRequests * row.share);
  const input = requests * row.inputPerRequest;
  const output = requests * row.outputPerRequest;
  const cached = Math.round(input * row.cachedShare);
  const reasoning = Math.round(output * row.reasoningShare);
  const cost =
    ((input - cached) * row.input +
      cached * row.cached +
      (output - reasoning) * row.output +
      reasoning * row.reasoning) /
    1_000_000;
  return {
    request_count: requests,
    input_tokens: input,
    output_tokens: output,
    cached_tokens: cached,
    reasoning_tokens: reasoning,
    total_tokens: input + output,
    cost_usd: cost,
  };
}

function addCounts(a: Counts, b: Counts): Counts {
  return {
    request_count: a.request_count + b.request_count,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cached_tokens: a.cached_tokens + b.cached_tokens,
    reasoning_tokens: a.reasoning_tokens + b.reasoning_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
    cost_usd: a.cost_usd + b.cost_usd,
  };
}

function roundCost<T extends { cost_usd: number }>(counts: T): T {
  return { ...counts, cost_usd: Math.round(counts.cost_usd * 1_000_000) / 1_000_000 };
}

export function otelHealth() {
  return { available: true, ok: true };
}

export function otelPricing() {
  return {
    currency: "USD",
    unit: "per_1m_tokens",
    models: PRICED_MODELS.map(({ model, input, output, cached, reasoning }) => ({
      model,
      input,
      output,
      cached,
      reasoning,
    })),
  };
}

export function otelUsage(ctx: DemoRequestContext) {
  const since = typeof ctx.query.since === "string" ? ctx.query.since : "24h";
  const range = Object.hasOwn(RANGES, since) ? RANGES[since] : RANGES["24h"];
  const hourly = range.granularity === "hour";
  const stepMs = hourly ? HOUR_MS : ONE_DAY_MS;
  const latest = Math.floor(Date.now() / stepMs) * stepMs;
  const wave: readonly number[] = hourly ? HOURLY_REQUESTS : DAILY_REQUESTS;

  const byModel = PRICED_MODELS.map((row) => ({ row, counts: EMPTY_COUNTS }));
  const timeseries = Array.from({ length: range.buckets }, (_, i) => {
    const bucketMs = latest - (range.buckets - 1 - i) * stepMs;
    const position = Math.floor(bucketMs / stepMs) % wave.length;
    let bucket = EMPTY_COUNTS;
    for (const entry of byModel) {
      const usage = usageFor(entry.row, wave[position]);
      entry.counts = addCounts(entry.counts, usage);
      bucket = addCounts(bucket, usage);
    }
    return { t: new Date(bucketMs).toISOString(), ...roundCost(bucket) };
  });

  const total = byModel.reduce(
    (sum, entry) => addCounts(sum, entry.counts),
    EMPTY_COUNTS,
  );

  return {
    ...roundCost(total),
    avg_cost_per_request:
      total.request_count > 0 ? total.cost_usd / total.request_count : 0,
    cost_per_1m_tokens:
      total.total_tokens > 0
        ? (total.cost_usd / total.total_tokens) * 1_000_000
        : 0,
    pricing_configured: true,
    cost_source: "rates" as const,
    currency: "USD",
    by_model: byModel
      .map(({ row, counts }) => ({
        model: row.model,
        ...roundCost(counts),
        avg_duration_ns: row.avgDurationNs,
        priced: true,
        cost_source: "rates" as const,
      }))
      .sort((a, b) => b.request_count - a.request_count),
    timeseries,
    timeseries_granularity: range.granularity,
  };
}
