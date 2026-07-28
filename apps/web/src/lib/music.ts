import { withApiVersion, type MusicHealth } from "@questorylabs/shared";
import { getApiUrl, runtimeEnv } from "@/lib/runtime-env";

/** Music APIs live on the Steam API origin under `/v1/music/*` (ListenBrainz stays `/1/*`). */
export function getMusicUrl(): string {
  return getApiUrl();
}

export function isMusicFlagEnabled(): boolean {
  const v =
    runtimeEnv("NEXT_PUBLIC_ENABLE_MUSIC") ||
    process.env.NEXT_PUBLIC_ENABLE_MUSIC;
  return (v || "").trim().toLowerCase() === "true";
}

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
  return `${getMusicUrl()}${musicPath(path)}`;
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
    const res = await fetch(`${getMusicUrl()}/health`, {
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

/** Local calendar day key `YYYY-MM-DD` for grouping listens. */
export function listenDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Section header: Today, Yesterday, then a readable date. */
export function formatListenDayHeader(iso: string, now = new Date()): string {
  const day = startOfLocalDay(new Date(iso));
  const today = startOfLocalDay(now);
  const diffDays = Math.round(
    (today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = day.getFullYear() === today.getFullYear();
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Per-row time: relative for today, clock time on older days
 * (date lives in the group header).
 */
export function formatListenRowTime(iso: string, now = new Date()): string {
  const at = new Date(iso);
  const today = startOfLocalDay(now);
  const day = startOfLocalDay(at);
  if (day.getTime() === today.getTime()) {
    const deltaMs = Math.max(0, now.getTime() - at.getTime());
    const mins = Math.floor(deltaMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
  }
  return at.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ListenDayGroup<T extends { listenedAt: string }> = {
  dayKey: string;
  label: string;
  items: T[];
};

/** Group listens by local calendar day, newest day first. */
export function groupListensByDay<T extends { listenedAt: string }>(
  items: T[],
  now = new Date(),
): ListenDayGroup<T>[] {
  const groups = new Map<string, ListenDayGroup<T>>();
  for (const item of items) {
    const dayKey = listenDayKey(item.listenedAt);
    let group = groups.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        label: formatListenDayHeader(item.listenedAt, now),
        items: [],
      };
      groups.set(dayKey, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
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
