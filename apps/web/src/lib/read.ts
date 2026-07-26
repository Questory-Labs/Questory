import { withApiVersion } from "@questorylabs/shared";

/** Read APIs live on the Steam API origin under `/v1/read/*`. */
export const READ_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const READ_FLAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_READ === "true";

function prefixReadPath(path: string): string {
  if (
    path.startsWith("/analytics") ||
    path.startsWith("/library") ||
    path.startsWith("/anilist") ||
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
  return `${READ_URL}${readPath(path)}`;
}

export async function readFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(readUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
    },
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
    const res = await fetch(`${READ_URL}/health`, {
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
