/** Avoid Content-Type on bodyless GET/HEAD — it triggers CORS preflight. */
export function jsonRequestHeaders(init: RequestInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  const method = (init.method ?? "GET").toUpperCase();
  const hasBody =
    init.body != null && method !== "GET" && method !== "HEAD";
  if (
    hasBody &&
    !(init.body instanceof FormData) &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}
