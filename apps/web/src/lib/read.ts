import { withApiVersion } from "@questorylabs/shared";
import { getApiUrl, runtimeEnv } from "@/lib/runtime-env";
import { probeJsonSafe, requestJson } from "@/lib/qhttp-client";

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
  return requestJson<T>(readUrl(path), init);
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
  const body = await probeJsonSafe<{
    ok?: boolean;
    read?: { enabled?: boolean };
  }>(`${getReadUrl()}/health`);
  if (!body) return { ok: false };
  return {
    ok: body.ok === true && body.read?.enabled !== false,
  };
}
