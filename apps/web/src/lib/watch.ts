import { withApiVersion, type WatchHealth } from "@questorylabs/shared";
import { getApiUrl, runtimeEnv } from "@/lib/runtime-env";
import { probeJsonSafe, requestJson } from "@/lib/qhttp-client";

/** Watch APIs live on the Steam API origin under `/v1/watch/*` (webhooks stay `/webhooks/*`). */
export function getWatchUrl(): string {
  return getApiUrl();
}

export function isWatchFlagEnabled(): boolean {
  const v =
    runtimeEnv("NEXT_PUBLIC_ENABLE_WATCH") ||
    process.env.NEXT_PUBLIC_ENABLE_WATCH;
  return (v || "").trim().toLowerCase() === "true";
}

function prefixWatchPath(path: string): string {
  if (
    path.startsWith("/analytics") ||
    path.startsWith("/catalog") ||
    path.startsWith("/imports") ||
    path.startsWith("/trakt") ||
    path.startsWith("/anilist") ||
    path.startsWith("/mal") ||
    path.startsWith("/shikimori") ||
    path.startsWith("/bangumi") ||
    path.startsWith("/kitsu") ||
    path.startsWith("/letterboxd") ||
    path.startsWith("/sync-status") ||
    path.startsWith("/watch/")
  ) {
    if (path.startsWith("/watch/")) return path;
    return `/watch${path}`;
  }
  return path;
}

function watchPath(path: string) {
  return withApiVersion(prefixWatchPath(path), ["/health", "/webhooks"]);
}

/** Absolute URL on the API origin, with `/v1` / watch prefix applied when needed. */
export function watchUrl(path: string) {
  return `${getWatchUrl()}${watchPath(path)}`;
}

export function watchFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return requestJson<T>(watchUrl(path), init);
}

/** Debounce for Watch log title search typeahead. */
export const WATCH_LOG_SEARCH_DEBOUNCE_MS = 300;

export function formatShare(count: number, total: number): string {
  if (total <= 0) return "—";
  const pct = Math.round((count / total) * 1000) / 10;
  return `${pct}%`;
}

export function formatDeltaPct(delta: number | null | undefined): string {
  if (delta == null) return "—";
  if (delta > 0) return `+${delta}%`;
  return `${delta}%`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function fetchWatchHealth(): Promise<WatchHealth> {
  const body = await probeJsonSafe<{
    ok?: boolean;
    watch?: { enabled?: boolean };
  }>(`${getWatchUrl()}/health`);
  if (!body) {
    return { ok: false, service: "questorylabs-watch" };
  }
  const watchOk = body.ok === true && body.watch?.enabled !== false;
  return {
    ok: watchOk,
    service: "questorylabs-watch",
  };
}

export function formatWatchRating(
  rating: number | null | undefined,
): string | null {
  if (rating == null || !Number.isFinite(rating)) return null;
  return `★ ${rating}`;
}

export function formatYourWatchRating(
  rating: number | null | undefined,
): string | null {
  const stars = formatWatchRating(rating);
  return stars ? `${stars}` : null;
}
