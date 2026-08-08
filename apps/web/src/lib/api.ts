import { withApiVersion } from "@questorylabs/shared";
import { getApiUrl } from "@/lib/runtime-env";
import { requestJson } from "@/lib/qhttp-client";

function apiPath(path: string) {
  return withApiVersion(path, ["/auth", "/health"]);
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return requestJson<T>(`${getApiUrl()}${apiPath(path)}`, init);
}

/** @deprecated Steam is link-only via Connections; use steamLinkUrl from auth-api. */
export function steamLoginUrl() {
  return `${getApiUrl()}/auth/steam`;
}

export function apiOrigin() {
  return getApiUrl();
}
