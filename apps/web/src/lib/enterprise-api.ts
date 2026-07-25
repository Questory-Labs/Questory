import type {
  CurationJob,
  DossierView,
  FeedbackAction,
  RecommendationDomain,
  RecommendationResponse,
  UserSettings,
} from "@/lib/enterprise-types";

const ENTERPRISE_URL = (
  process.env.NEXT_PUBLIC_ENTERPRISE_URL || "http://localhost:4030"
).replace(/\/+$/, "");

export function enterpriseBaseUrl(): string {
  return ENTERPRISE_URL;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENTERPRISE_URL}${path}`, {
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

/** Agentic path — starts (or joins) a curation job. */
export async function startCurationJob(options: {
  limit?: number;
  domains?: RecommendationDomain[];
  mood?: string;
}): Promise<CurationJob> {
  return request<CurationJob>("/v1/recommendations/curate", {
    method: "POST",
    body: JSON.stringify({
      limit: options.limit,
      domains: options.domains,
      context: clientContext(options.mood),
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

/** Loose usage payload — fields evolve; UI reads known keys. */
export type OtelUsage = Record<string, unknown>;

export type OtelTraceSummary = {
  trace_id?: string;
  traceId?: string;
  root_span?: string;
  rootSpan?: string;
  name?: string;
  duration_ns?: number;
  durationNs?: number;
  duration?: number;
  span_count?: number;
  spanCount?: number;
  spans?: number;
  status?: string;
};

export type OtelSpan = {
  name?: string;
  span_name?: string;
  duration_ns?: number;
  durationNs?: number;
  duration?: number;
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

export async function fetchOtelTraces(options: {
  since?: string;
  limit?: number;
}): Promise<unknown> {
  const qs = new URLSearchParams();
  if (options.since) qs.set("since", options.since);
  if (options.limit != null) qs.set("limit", String(options.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<unknown>(`/v1/enterprise/otel/traces${suffix}`);
}

export async function fetchOtelTrace(traceId: string): Promise<unknown> {
  return request<unknown>(
    `/v1/enterprise/otel/traces/${encodeURIComponent(traceId)}`,
  );
}
