import { withApiVersion, type MusicHealth } from "@questorylabs/shared";

export const MUSIC_URL =
  process.env.NEXT_PUBLIC_MUSIC_URL || "http://localhost:4010";

export const MUSIC_FLAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MUSIC === "true";

function musicPath(path: string) {
  return withApiVersion(path, ["/health", "/1", "/apis"]);
}

/** Absolute URL on the music origin, with `/v1` applied when needed. */
export function musicUrl(path: string) {
  return `${MUSIC_URL}${musicPath(path)}`;
}

export async function musicFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(musicUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Music request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMusicHealth(): Promise<MusicHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${MUSIC_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, service: "questorylabs-music" };
    }
    return (await res.json()) as MusicHealth;
  } catch {
    return { ok: false, service: "questorylabs-music" };
  } finally {
    clearTimeout(timer);
  }
}

export function formatListenDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatListenDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
