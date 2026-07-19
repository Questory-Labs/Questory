import { withApiVersion } from "@questorylabs/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function apiPath(path: string) {
  return withApiVersion(path, ["/auth", "/health"]);
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${apiPath(path)}`, {
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
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function steamLoginUrl() {
  return `${API_URL}/auth/steam`;
}

export function apiOrigin() {
  return API_URL;
}
