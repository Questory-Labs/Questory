import { withApiVersion, type MusicHealth } from "@questorylabs/shared";

/** Music APIs live on the Steam API origin under `/v1/music/*` (ListenBrainz stays `/1/*`). */
export const MUSIC_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const MUSIC_FLAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MUSIC === "true";

function prefixMusicPath(path: string): string {
  if (
    path.startsWith("/analytics") ||
    path.startsWith("/imports") ||
    path.startsWith("/music/")
  ) {
    if (path.startsWith("/music/")) return path;
    return `/music${path}`;
  }
  return path;
}

function musicPath(path: string) {
  return withApiVersion(prefixMusicPath(path), ["/health", "/1", "/apis"]);
}

/** Absolute URL on the API origin, with `/v1` / music prefix applied when needed. */
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
    const body = (await res.json()) as {
      ok?: boolean;
      music?: { enabled?: boolean };
    };
    const musicOk = body.ok === true && body.music?.enabled !== false;
    return {
      ok: musicOk,
      service: "questorylabs-music",
    };
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
