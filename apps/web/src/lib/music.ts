import { withApiVersion, type MusicHealth } from "@questorylabs/shared";

export const MUSIC_URL =
  process.env.NEXT_PUBLIC_MUSIC_URL || "http://localhost:4010";

export const MUSIC_FLAG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MUSIC === "true";

function musicPath(path: string) {
  return withApiVersion(path, ["/health", "/1", "/apis"]);
}

export async function musicFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${MUSIC_URL}${musicPath(path)}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
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
