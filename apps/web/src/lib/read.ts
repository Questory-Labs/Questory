import { withApiVersion } from "@questorylabs/shared";
import { getApiUrl, runtimeEnv } from "@/lib/runtime-env";
import { jsonRequestHeaders } from "@/lib/json-fetch";

/** Read APIs live on the Steam API origin under `/v1/read/*`. */
export function getReadUrl(): string {
  return getApiUrl();
}

export function isReadFlagEnabled(): boolean {
  const v =
    runtimeEnv("NEXT_PUBLIC_ENABLE_READ") ||
    process.env.NEXT_PUBLIC_ENABLE_READ;
  return (v || "").trim().toLowerCase() === "true";
}

function prefixReadPath(path: string): string {
  if (
    path.startsWith("/analytics") ||
    path.startsWith("/catalog") ||
    path.startsWith("/library") ||
    path.startsWith("/anilist") ||
    path.startsWith("/mal") ||
    path.startsWith("/shikimori") ||
    path.startsWith("/bangumi") ||
    path.startsWith("/kitsu") ||
    path.startsWith("/sync-status") ||
    path.startsWith("/read/")
  ) {
    if (path.startsWith("/read/")) return path;
    return `/read${path}`;
  }
  return path;
}

function readPath(path: string) {
  return withApiVersion(prefixReadPath(path), ["/health"]);
}

export function readUrl(path: string) {
  return `${getReadUrl()}${readPath(path)}`;
}

export async function readFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(readUrl(path), {
    ...init,
    credentials: "include",
    headers: jsonRequestHeaders(init),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Read request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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

export async function fetchReadHealth(): Promise<{ ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${getReadUrl()}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as {
      ok?: boolean;
      read?: { enabled?: boolean };
    };
    return {
      ok: body.ok === true && body.read?.enabled !== false,
    };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
