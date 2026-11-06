import type { DemoRequestContext } from "../demo.types";
import { boundedInt, DEMO_MODELS } from "./enterprise-shared";

const NS_PER_MS = 1_000_000;
const HOUR_MS = 60 * 60 * 1000;

type SpanSpec = {
  name: string;
  parent: number | null;
  startMs: number;
  durationMs: number;
  model?: string;
  operation?: "chat" | "embeddings";
  input?: number;
  output?: number;
  error?: boolean;
  stage?: string;
};

type TraceTemplate = { root: string; spans: readonly SpanSpec[] };

const SERVICE_NAME = "qengine";

const CURATE: TraceTemplate = {
  root: "recommendations.curate",
  spans: [
    { name: "recommendations.curate", parent: null, startMs: 0, durationMs: 12_480 },
    { name: "mood.parse", parent: 0, startMs: 20, durationMs: 780, model: DEMO_MODELS.fast, operation: "chat", input: 410, output: 62 },
    { name: "candidates.score", parent: 0, startMs: 810, durationMs: 340, stage: "scoring" },
    { name: "embeddings.lookup", parent: 2, startMs: 830, durationMs: 150, model: DEMO_MODELS.embed, operation: "embeddings", input: 180 },
    { name: "curator.rerank", parent: 0, startMs: 1_160, durationMs: 8_220, model: DEMO_MODELS.reason, operation: "chat", input: 6_240, output: 720 },
    { name: "editorial.write", parent: 0, startMs: 9_390, durationMs: 3_040, model: DEMO_MODELS.write, operation: "chat", input: 2_980, output: 460 },
  ],
};

const RECOMMEND: TraceTemplate = {
  root: "recommendations.heuristic",
  spans: [
    { name: "recommendations.heuristic", parent: null, startMs: 0, durationMs: 214 },
    { name: "profile.load", parent: 0, startMs: 4, durationMs: 62, stage: "profile" },
    { name: "candidates.score", parent: 0, startMs: 70, durationMs: 128, stage: "scoring" },
  ],
};

const DOSSIER: TraceTemplate = {
  root: "dossier.refresh",
  spans: [
    { name: "dossier.refresh", parent: null, startMs: 0, durationMs: 6_120 },
    { name: "profile.load", parent: 0, startMs: 8, durationMs: 96, stage: "profile" },
    { name: "dossier.write", parent: 0, startMs: 110, durationMs: 5_980, model: DEMO_MODELS.write, operation: "chat", input: 3_420, output: 610 },
  ],
};

const DIGEST: TraceTemplate = {
  root: "weekly_digest.generate",
  spans: [
    { name: "weekly_digest.generate", parent: null, startMs: 0, durationMs: 4_260 },
    { name: "world.snapshot", parent: 0, startMs: 10, durationMs: 310, stage: "charts" },
    { name: "insight.write", parent: 0, startMs: 330, durationMs: 3_900, model: DEMO_MODELS.write, operation: "chat", input: 2_640, output: 380 },
  ],
};

const GOALS: TraceTemplate = {
  root: "goals.ai_board",
  spans: [
    { name: "goals.ai_board", parent: null, startMs: 0, durationMs: 1_640 },
    { name: "candidates.score", parent: 0, startMs: 6, durationMs: 180, stage: "scoring" },
    { name: "goals.reason", parent: 0, startMs: 190, durationMs: 1_420, model: DEMO_MODELS.fast, operation: "chat", input: 1_260, output: 190 },
  ],
};

const SEARCH: TraceTemplate = {
  root: "recommendations.search",
  spans: [
    { name: "recommendations.search", parent: null, startMs: 0, durationMs: 188 },
    { name: "embeddings.query", parent: 0, startMs: 3, durationMs: 124, model: DEMO_MODELS.embed, operation: "embeddings", input: 42 },
    { name: "vector.lookup", parent: 0, startMs: 130, durationMs: 54, stage: "search" },
  ],
};

const CURATE_FAILED: TraceTemplate = {
  root: "recommendations.curate",
  spans: [
    { name: "recommendations.curate", parent: null, startMs: 0, durationMs: 30_620, error: true },
    { name: "candidates.score", parent: 0, startMs: 12, durationMs: 310, stage: "scoring" },
    { name: "curator.rerank", parent: 0, startMs: 330, durationMs: 30_000, model: DEMO_MODELS.reason, operation: "chat", input: 5_980, output: 0, error: true },
  ],
};

const TRACE_SCHEDULE: readonly { hoursAgo: number; template: TraceTemplate }[] = [
  { hoursAgo: 0.2, template: RECOMMEND },
  { hoursAgo: 0.6, template: CURATE },
  { hoursAgo: 1.5, template: SEARCH },
  { hoursAgo: 2.4, template: RECOMMEND },
  { hoursAgo: 3.3, template: GOALS },
  { hoursAgo: 5, template: CURATE },
  { hoursAgo: 7, template: DOSSIER },
  { hoursAgo: 9, template: CURATE_FAILED },
  { hoursAgo: 11, template: RECOMMEND },
  { hoursAgo: 14, template: DIGEST },
  { hoursAgo: 17, template: CURATE },
  { hoursAgo: 20, template: SEARCH },
  { hoursAgo: 23, template: GOALS },
  { hoursAgo: 30, template: CURATE },
  { hoursAgo: 40, template: DIGEST },
  { hoursAgo: 55, template: RECOMMEND },
  { hoursAgo: 75, template: DOSSIER },
  { hoursAgo: 100, template: CURATE },
  { hoursAgo: 130, template: GOALS },
  { hoursAgo: 165, template: DIGEST },
  { hoursAgo: 250, template: CURATE },
  { hoursAgo: 400, template: DOSSIER },
  { hoursAgo: 600, template: CURATE },
];

const SINCE_HOURS: Record<string, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

function hexWord(seed: number, salt: number): string {
  return ((Math.imul(seed + 1, 0x9e3779b1) ^ salt) >>> 0)
    .toString(16)
    .padStart(8, "0");
}

function traceIdAt(index: number): string {
  return [0x5bd1e995, 0x1b873593, 0xcc9e2d51, 0xe6546b64]
    .map((salt) => hexWord(index, salt))
    .join("");
}

function spanIdAt(traceIndex: number, spanIndex: number): string {
  const seed = traceIndex * 100 + spanIndex;
  return hexWord(seed, 0x2f0b4a87) + hexWord(seed, 0x7a3d91c5);
}

function traceStartNs(index: number, now: number): number {
  const startMs = now - TRACE_SCHEDULE[index].hoursAgo * HOUR_MS;
  return Math.floor(startMs) * NS_PER_MS;
}

export function otelTraces(ctx: DemoRequestContext) {
  const now = Date.now();
  const since = typeof ctx.query.since === "string" ? ctx.query.since : "24h";
  const hours = Object.hasOwn(SINCE_HOURS, since) ? SINCE_HOURS[since] : 24;
  const limit = boundedInt(ctx.query.limit, 40, 1, 200);
  const offset = boundedInt(ctx.query.offset, 0, 0, TRACE_SCHEDULE.length);
  const matching = TRACE_SCHEDULE.map((entry, index) => ({ entry, index })).filter(
    ({ entry }) => entry.hoursAgo <= hours,
  );
  return {
    traces: matching.slice(offset, offset + limit).map(({ entry, index }) => ({
      trace_id: traceIdAt(index),
      root_span: entry.template.root,
      start_time_unix_nano: traceStartNs(index, now),
      duration_ns: entry.template.spans[0].durationMs * NS_PER_MS,
      span_count: entry.template.spans.length,
      status: entry.template.spans.some((span) => span.error) ? "ERROR" : "OK",
    })),
    total: matching.length,
    limit,
    offset,
  };
}

function spanAttributes(span: SpanSpec): Record<string, string | number> {
  if (!span.model) {
    return span.stage ? { "qengine.stage": span.stage } : {};
  }
  return {
    "gen_ai.system": "demo",
    "gen_ai.request.model": span.model,
    "gen_ai.operation.name": span.operation ?? "chat",
    "gen_ai.usage.input_tokens": span.input ?? 0,
    "gen_ai.usage.output_tokens": span.output ?? 0,
  };
}

export function otelTrace(ctx: DemoRequestContext) {
  const found = TRACE_SCHEDULE.findIndex(
    (_, index) => traceIdAt(index) === ctx.params.traceId,
  );
  const index = found >= 0 ? found : 0;
  const traceId = traceIdAt(index);
  const startNs = traceStartNs(index, Date.now());
  return {
    trace_id: traceId,
    spans: TRACE_SCHEDULE[index].template.spans.map((span, spanIndex) => {
      const spanStart = startNs + span.startMs * NS_PER_MS;
      const durationNs = span.durationMs * NS_PER_MS;
      return {
        trace_id: traceId,
        span_id: spanIdAt(index, spanIndex),
        parent_span_id:
          span.parent === null ? null : spanIdAt(index, span.parent),
        name: span.name,
        duration_ns: durationNs,
        start_time_unix_nano: spanStart,
        end_time_unix_nano: spanStart + durationNs,
        status: span.error ? "ERROR" : "OK",
        service_name: SERVICE_NAME,
        attributes: spanAttributes(span),
      };
    }),
  };
}
