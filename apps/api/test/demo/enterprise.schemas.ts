import { z } from "zod";
import {
  AiGoalsResponseSchema,
  TasteClusterPreviewSchema,
  WeeklyDigestViewSchema,
} from "@questorylabs/shared";

const ItemSchema = z.strictObject({
  kind: z.literal("game"),
  domain: z.literal("games"),
  gameId: z.string(),
  appId: z.number(),
  name: z.string(),
  imageUrl: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)).min(1),
  blurb: z.string().optional(),
  why: z.string().optional(),
  itemKey: z.string(),
  cardType: z.string().optional(),
});

const RecommendationResponseSchema = z.strictObject({
  available: z.literal(true),
  engine: z.string(),
  userId: z.string(),
  generatedAt: z.string(),
  ml: z.strictObject({ enabled: z.boolean(), ready: z.boolean(), model: z.string().optional() }),
  llm: z.strictObject({
    enabled: z.boolean(),
    ready: z.boolean(),
    model: z.string().optional(),
    tiers: z.array(
      z.strictObject({
        tier: z.enum(["reason", "write", "fast"]),
        model: z.string(),
        reasoning: z.string(),
      }),
    ),
    embedModel: z.string().optional(),
  }),
  moodSummary: z.string().optional(),
  plan: z
    .strictObject({
      title: z.string(),
      steps: z.array(z.strictObject({ itemIndex: z.number().optional(), note: z.string() })),
    })
    .optional(),
  worldSummary: z.string().optional(),
  items: z.array(ItemSchema),
  arm: z.enum(["heuristic", "rerank"]),
});

const CurationJobSchema = z.strictObject({
  jobId: z.string(),
  status: z.literal("done"),
  events: z.array(z.never()),
  result: RecommendationResponseSchema,
});

const SuggestionsSchema = z.strictObject({
  generatedAt: z.string(),
  timeframe: z.string(),
  targetCount: z.number(),
  suggestions: z.array(
    z.strictObject({
      itemKey: z.string(),
      name: z.string(),
      domain: z.literal("games"),
      kind: z.literal("game"),
      estimatedTimeMinutes: z.number(),
      reason: z.string(),
    }),
  ),
});

const SearchSchema = z.strictObject({
  available: z.literal(true),
  items: z.array(
    z.strictObject({
      key: z.string(),
      id: z.string(),
      domain: z.literal("games"),
      kind: z.string(),
      name: z.string(),
      imageUrl: z.string(),
      year: z.number(),
      score: z.number(),
    }),
  ),
});

const HistorySchema = z.strictObject({
  slates: z.array(
    z.strictObject({
      slateId: z.string(),
      arm: z.string(),
      source: z.string(),
      ask: z.string(),
      servedAt: z.number(),
      items: z.array(
        z.strictObject({
          itemKey: z.string(),
          name: z.string(),
          domain: z.string(),
          rank: z.number(),
          why: z.string(),
          owned: z.boolean(),
          feedback: z.enum(["like", "dislike", "dismiss"]).nullable(),
        }),
      ),
    }),
  ),
  liked: z.array(z.string()),
  passed: z.array(z.string()),
});

const DossierSchema = z.strictObject({
  available: z.literal(true),
  dossier: z.strictObject({
    identity: z.string(),
    gaming: z.string(),
    music: z.string(),
    watch: z.string(),
    read: z.string(),
    currentVibe: z.string(),
    keywords: z.array(z.string()).min(1),
  }),
  updatedAt: z.number(),
  refreshing: z.literal(false),
});

const SettingsSchema = z.strictObject({
  country: z.string(),
  state: z.string(),
  city: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const GuardrailAction = z.enum(["allow", "mask", "rewrite", "block"]);
const GuardrailsSchema = z.strictObject({
  categories: z.record(z.string(), GuardrailAction),
  blocklist: z.array(z.string()),
  blocklistAction: GuardrailAction,
  regexRules: z.array(z.strictObject({ pattern: z.string(), action: GuardrailAction })),
});

const BudgetForecast = {
  burnPerDayUsd: z.number(),
  projectedUsd: z.number(),
  willOvershoot: z.boolean(),
  overshootOn: z.string().nullable(),
  exhausted: z.boolean(),
};
export const BudgetSchema = z.strictObject({
  settings: z.strictObject({
    period: z.enum(["weekly", "monthly"]),
    totalUsd: z.number().nullable(),
    models: z.record(z.string(), z.number()),
  }),
  periodStart: z.string(),
  periodEnd: z.string(),
  total: z.strictObject({
    budgetUsd: z.number().nullable(),
    spentUsd: z.number(),
    remainingUsd: z.number().nullable(),
    ...BudgetForecast,
  }),
  models: z
    .array(
      z.strictObject({
        model: z.string(),
        budgetUsd: z.number().nullable(),
        requests: z.number(),
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
        costUsd: z.number(),
        stopped: z.boolean(),
        priced: z.boolean(),
        ...BudgetForecast,
      }),
    )
    .min(1),
  trend: z
    .array(
      z.strictObject({
        day: z.string(),
        spentUsd: z.number().nullable(),
        projectedUsd: z.number().nullable(),
      }),
    )
    .min(1),
  blocks: z.array(z.never()),
});

const UsageCounts = {
  request_count: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  total_tokens: z.number(),
  cached_tokens: z.number(),
  reasoning_tokens: z.number(),
  cost_usd: z.number(),
};
const UsageSchema = z.strictObject({
  ...UsageCounts,
  avg_cost_per_request: z.number(),
  cost_per_1m_tokens: z.number(),
  pricing_configured: z.literal(true),
  cost_source: z.literal("rates"),
  currency: z.literal("USD"),
  by_model: z
    .array(
      z.strictObject({
        ...UsageCounts,
        model: z.string(),
        avg_duration_ns: z.number(),
        priced: z.boolean(),
        cost_source: z.string(),
      }),
    )
    .min(1),
  timeseries: z.array(z.strictObject({ ...UsageCounts, t: z.string() })).min(1),
  timeseries_granularity: z.enum(["hour", "day"]),
});

const PricingSchema = z.strictObject({
  currency: z.string(),
  unit: z.string(),
  models: z
    .array(
      z.strictObject({
        model: z.string(),
        input: z.number(),
        output: z.number(),
        cached: z.number(),
        reasoning: z.number(),
      }),
    )
    .min(1),
});

const TracesSchema = z.strictObject({
  traces: z.array(
    z.strictObject({
      trace_id: z.string().regex(/^[0-9a-f]{32}$/),
      root_span: z.string(),
      start_time_unix_nano: z.number(),
      duration_ns: z.number(),
      span_count: z.number(),
      status: z.enum(["OK", "ERROR"]),
    }),
  ),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

const TraceDetailSchema = z.strictObject({
  trace_id: z.string(),
  spans: z
    .array(
      z.strictObject({
        trace_id: z.string(),
        span_id: z.string().regex(/^[0-9a-f]{16}$/),
        parent_span_id: z.string().nullable(),
        name: z.string(),
        duration_ns: z.number(),
        start_time_unix_nano: z.number(),
        end_time_unix_nano: z.number(),
        status: z.enum(["OK", "ERROR"]),
        service_name: z.string(),
        attributes: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
    )
    .min(1),
});

export const SHAPED_ROUTES: readonly [
  "GET" | "POST",
  string,
  { parse: (value: unknown) => unknown },
][] = [
  ["POST", "/recommendations", RecommendationResponseSchema],
  ["POST", "/recommendations/curate", CurationJobSchema],
  ["POST", "/recommendations/curate/cache", z.strictObject({ cached: z.literal(false) })],
  ["POST", "/recommendations/goals", SuggestionsSchema],
  ["POST", "/recommendations/goals/ai", AiGoalsResponseSchema],
  ["POST", "/recommendations/search", SearchSchema],
  ["POST", "/recommendations/weekly-digest", WeeklyDigestViewSchema],
  ["POST", "/recommendations/weekly-digest/cache", WeeklyDigestViewSchema],
  ["GET", "/recommendations/curate/demo-1", CurationJobSchema],
  ["GET", "/recommendations/history", HistorySchema],
  ["GET", "/recommendations/clusters/preview", TasteClusterPreviewSchema],
  ["GET", "/enterprise/dossier", DossierSchema],
  ["GET", "/enterprise/settings", SettingsSchema],
  ["GET", "/enterprise/guardrails", GuardrailsSchema],
  ["GET", "/enterprise/llm/budget", BudgetSchema],
  [
    "GET",
    "/enterprise/otel/health",
    z.strictObject({ available: z.literal(true), ok: z.literal(true) }),
  ],
  ["GET", "/enterprise/otel/usage", UsageSchema],
  ["GET", "/enterprise/otel/pricing", PricingSchema],
  ["GET", "/enterprise/otel/traces", TracesSchema],
  ["GET", "/enterprise/otel/traces/unknown-id", TraceDetailSchema],
];
