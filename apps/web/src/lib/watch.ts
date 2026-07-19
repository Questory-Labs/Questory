import { withApiVersion, type WatchHealth } from "@questorylabs/shared";

export const WATCH_URL =
  process.env.NEXT_PUBLIC_WATCH_URL || "http://localhost:4020";

export const WATCH_FLAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_WATCH === "true";

function watchPath(path: string) {
  return withApiVersion(path, ["/health", "/webhooks"]);
}

/** Absolute URL on the watch origin, with `/v1` applied when needed. */
export function watchUrl(path: string) {
  return `${WATCH_URL}${watchPath(path)}`;
}

export async function watchFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(watchUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Watch request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWatchHealth(): Promise<WatchHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${WATCH_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, service: "questorylabs-watch" };
    }
    return (await res.json()) as WatchHealth;
  } catch {
    return { ok: false, service: "questorylabs-watch" };
  } finally {
    clearTimeout(timer);
  }
}
