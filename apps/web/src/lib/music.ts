import { withApiVersion, type MusicHealth } from "@questorylabs/shared";
import {
  type DayGroup,
  formatDate,
  formatDateTime,
  formatDayHeader,
  formatRowTime,
  groupByLocalDay,
  localDayKey,
} from "@/lib/dates";
import { getApiUrl, runtimeEnv } from "@/lib/runtime-env";
import { jsonRequestHeaders } from "@/lib/json-fetch";

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
    path.startsWith("/catalog") ||
    path.startsWith("/corrections") ||
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
    headers: jsonRequestHeaders(init),
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
  return formatDate(iso);
}

export function formatListenDateTime(iso: string): string {
  return formatDateTime(iso);
}

/** Local calendar day key `YYYY-MM-DD` for grouping listens. */
export function listenDayKey(iso: string): string {
  return localDayKey(iso);
}

/** Section header: Today, Yesterday, then a readable date. */
export function formatListenDayHeader(iso: string, now = new Date()): string {
  return formatDayHeader(iso, now);
}

/**
 * Per-row time: relative for today, clock time on older days
 * (date lives in the group header).
 */
export function formatListenRowTime(iso: string, now = new Date()): string {
  return formatRowTime(iso, now);
}

export type ListenDayGroup<T extends { listenedAt: string }> = DayGroup<T>;

/** Group listens by local calendar day, newest day first. */
export function groupListensByDay<T extends { listenedAt: string }>(
  items: T[],
  now = new Date(),
): ListenDayGroup<T>[] {
  return groupByLocalDay(items, (item) => item.listenedAt, now);
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
