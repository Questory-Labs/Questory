import type {
  CurateCacheView,
  CurationJob,
  DossierView,
  FeedbackAction,
  RecommendationDomain,
  RecommendationResponse,
  UserSettings,
} from "@/lib/enterprise-types";
import { getEnterpriseUrl } from "@/lib/runtime-env";

export function enterpriseBaseUrl(): string {
  return getEnterpriseUrl();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getEnterpriseUrl()}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || `Request failed: ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

function clientContext(mood?: string): Record<string, unknown> {
  return {
    localHour: new Date().getHours(),
    // 0 = Monday … 6 = Sunday
    localWeekday: (new Date().getDay() + 6) % 7,
    ...(mood ? { mood } : {}),
  };
}

/** Heuristic fast path — synchronous. */
export async function fetchRecommendations(options: {
  limit?: number;
  domains?: RecommendationDomain[];
}): Promise<RecommendationResponse> {
  return request<RecommendationResponse>("/v1/recommendations", {
    method: "POST",
    body: JSON.stringify({
      limit: options.limit,
      domains: options.domains,
      context: clientContext(),
    }),
  });
}

/** Peek curated cache for this mood/context (no job). */
export async function peekCurateCache(options: {
  limit?: number;
  domains?: RecommendationDomain[];
  mood?: string;
}): Promise<CurateCacheView> {
  return request<CurateCacheView>("/v1/recommendations/curate/cache", {
    method: "POST",
    body: JSON.stringify({
      limit: options.limit,
      domains: options.domains,
      context: clientContext(options.mood),
    }),
  });
}

/** Agentic path — starts (or joins a running) curation job. */
export async function startCurationJob(options: {
  limit?: number;
  domains?: RecommendationDomain[];
  mood?: string;
  /** Clear curated cache and re-run the agentic pipeline. */
  force?: boolean;
}): Promise<CurationJob> {
  return request<CurationJob>("/v1/recommendations/curate", {
    method: "POST",
    body: JSON.stringify({
      limit: options.limit,
      domains: options.domains,
      context: clientContext(options.mood),
      force: options.force === true,
    }),
  });
}

export async function getCurationJob(jobId: string): Promise<CurationJob> {
  return request<CurationJob>(
    `/v1/recommendations/curate/${encodeURIComponent(jobId)}`,
  );
}

export async function sendFeedback(
  itemKey: string,
  action: FeedbackAction,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/v1/recommendations/feedback", {
    method: "POST",
    body: JSON.stringify({ itemKey, action }),
  });
}

export async function fetchDossier(): Promise<DossierView> {
  return request<DossierView>("/v1/enterprise/dossier");
}

export async function fetchSettings(): Promise<UserSettings> {
  return request<UserSettings>("/v1/enterprise/settings");
}

export async function saveSettings(update: {
  country?: string;
  state?: string;
  city?: string;
}): Promise<UserSettings> {
  return request<UserSettings>("/v1/enterprise/settings", {
    method: "PUT",
    body: JSON.stringify(update),
  });
}

/* ── admin OTEL ── */

export type OtelHealth = {
  available: boolean;
  ok: boolean;
  error?: string;
};

export type OtelUsageBucket = {
  t: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  cost_usd?: number;
};

export type OtelModelUsage = {
  model: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  avg_duration_ns?: number;
  cost_usd?: number;
  priced?: boolean;
};

/** Loose usage payload — fields evolve; UI reads known keys. */
export type OtelUsage = {
  request_count?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  cost_usd?: number;
  avg_cost_per_request?: number;
  cost_per_1m_tokens?: number;
  pricing_configured?: boolean;
  by_model?: OtelModelUsage[];
  models?: OtelModelUsage[];
  timeseries?: OtelUsageBucket[];
  timeseries_granularity?: "hour" | "day" | string;
  [key: string]: unknown;
};

export type OtelModelPricing = {
  model: string;
  input: number;
  output: number;
  cached: number;
  reasoning: number;
};

export type OtelPricing = {
  currency?: string;
  unit?: string;
  models: OtelModelPricing[];
};

export type OtelTraceSummary = {
  trace_id?: string;
  traceId?: string;
  root_span?: string;
  rootSpan?: string;
  name?: string;
  start_time_unix_nano?: number;
  duration_ns?: number;
  durationNs?: number;
  duration?: number;
  span_count?: number;
  spanCount?: number;
  spans?: number;
  status?: string;
};

export type OtelTracesPage = {
  traces: OtelTraceSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type OtelSpan = {
  name?: string;
  span_name?: string;
  span_id?: string;
  parent_span_id?: string | null;
  duration_ns?: number;
  durationNs?: number;
  duration?: number;
  start_time_unix_nano?: number;
  end_time_unix_nano?: number;
  status?: string;
  service_name?: string | null;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OtelTraceDetail = {
  trace_id?: string;
  spans?: OtelSpan[];
};

export async function fetchEnterpriseStatus(): Promise<{
  available: boolean;
  service?: { ok: boolean; ready?: boolean; model?: string };
}> {
  return request("/v1/enterprise/status");
}

export async function fetchOtelHealth(): Promise<OtelHealth> {
  return request<OtelHealth>("/v1/enterprise/otel/health");
}

export async function fetchOtelUsage(since: string): Promise<OtelUsage> {
  const qs = new URLSearchParams({ since });
  return request<OtelUsage>(`/v1/enterprise/otel/usage?${qs}`);
}

export async function fetchOtelPricing(): Promise<OtelPricing> {
  return request<OtelPricing>("/v1/enterprise/otel/pricing");
}

export async function saveOtelPricing(
  models: OtelModelPricing[],
): Promise<OtelPricing> {
  return request<OtelPricing>("/v1/enterprise/otel/pricing", {
    method: "PUT",
    body: JSON.stringify({ models }),
  });
}

export async function fetchOtelTraces(options: {
  since?: string;
  limit?: number;
  offset?: number;
}): Promise<OtelTracesPage> {
  const qs = new URLSearchParams();
  if (options.since) qs.set("since", options.since);
  if (options.limit != null) qs.set("limit", String(options.limit));
  if (options.offset != null) qs.set("offset", String(options.offset));
  const suffix = qs.toString() ? `?${qs}` : "";
  const data = await request<unknown>(`/v1/enterprise/otel/traces${suffix}`);
  if (Array.isArray(data)) {
    return {
      traces: data as OtelTraceSummary[],
      total: data.length,
      limit: options.limit ?? data.length,
      offset: options.offset ?? 0,
    };
  }
  if (data && typeof data === "object") {
    const obj = data as {
      traces?: OtelTraceSummary[];
      total?: number;
      limit?: number;
      offset?: number;
    };
    const traces = Array.isArray(obj.traces) ? obj.traces : [];
    return {
      traces,
      total: typeof obj.total === "number" ? obj.total : traces.length,
      limit:
        typeof obj.limit === "number"
          ? obj.limit
          : (options.limit ?? traces.length),
      offset:
        typeof obj.offset === "number"
          ? obj.offset
          : (options.offset ?? 0),
    };
  }
  return {
    traces: [],
    total: 0,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
  };
}

export async function fetchOtelTrace(
  traceId: string,
): Promise<OtelTraceDetail> {
  return request<OtelTraceDetail>(
    `/v1/enterprise/otel/traces/${encodeURIComponent(traceId)}`,
  );
}
