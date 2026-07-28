import { withApiVersion } from "@questorylabs/shared";
import { getApiUrl } from "@/lib/runtime-env";

function apiPath(path: string) {
  return withApiVersion(path, ["/auth", "/health"]);
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${getApiUrl()}${apiPath(path)}`, {
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
    const err = new Error(text || `Request failed: ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

/** @deprecated Steam is link-only via Connections; use steamLinkUrl from auth-api. */
export function steamLoginUrl() {
  return `${getApiUrl()}/auth/steam`;
}

export function apiOrigin() {
  return getApiUrl();
}
