import {
  QHttp,
  type HttpAdapter,
  type FinalRequest,
  type RawResponseLike,
  type HttpMethod,
  type QHttpResult,
  type RequestBody,
} from "@questorylabs/qhttp";

class OutboundFetchAdapter implements HttpAdapter {
  async send(request: FinalRequest): Promise<RawResponseLike> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      cache: "no-store",
    });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      arrayBuffer: () => response.arrayBuffer(),
      json: () => response.json(),
      text: () => response.text(),
      blob: () => response.blob(),
    };
  }
}

const outboundAdapter = new OutboundFetchAdapter();

export const outboundHttp = new QHttp({
  throwOnError: false,
  adapter: outboundAdapter,
}).setRetry({
  retries: 3,
  backoff: "exponential",
  retryDelay: 500,
});

/** Fetch `Response` only accepts 200–599. QHttp uses 0 for transport failures. */
export function toFetchStatus(status: number): number {
  if (Number.isInteger(status) && status >= 200 && status <= 599) return status;
  return 503;
}

function fetchStatusText(status: number, raw: string | undefined): string {
  const fallback = status === 503 ? "Service Unavailable" : "Error";
  if (!raw) return fallback;
  const cleaned = raw.replace(/[\r\n]+/g, " ").trim().slice(0, 80);
  return cleaned || fallback;
}

function asResponse(result: QHttpResult): Response {
  if (result.response) return result.response;
  const status = toFetchStatus(result.httpStatus);
  const body =
    result.data == null
      ? result.error?.message ?? result.statusText ?? ""
      : typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data);
  const statusText =
    status === result.httpStatus
      ? fetchStatusText(status, result.statusText)
      : "Service Unavailable";
  if (typeof Response !== "undefined") {
    return new Response(body, {
      status,
      statusText,
      headers: result.headers,
    });
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(result.headers),
    text: async () => body,
    json: async () => JSON.parse(body || "null"),
  } as Response;
}

/** Outbound fetch with retries on 5xx/429 — returns native Response. */
export async function providerFetch(
  url: string | URL,
  init?: RequestInit,
  opts?: { retries?: number },
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase() as HttpMethod;
  const client = outboundHttp
    .clone()
    .setUrl(url.toString())
    .setRetry({
      retries: opts?.retries ?? 3,
      backoff: "exponential",
      retryDelay: 500,
    });

  if (init?.headers) {
    client.setHeaders(init.headers as Record<string, string>);
  }
  if (init?.body != null && method !== "GET" && method !== "HEAD") {
    client.setBody(init.body as RequestBody);
  }
  if (init?.signal) client.setSignal(init.signal);

  const result = await client.request({ method });
  return asResponse(result);
}

/** JSON helper for outbound APIs — throws on HTTP error. */
export async function outboundJson<T>(
  url: string,
  init?: RequestInit,
  opts?: { rejectHtml?: boolean },
): Promise<T> {
  const res = await providerFetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (opts?.rejectHtml && text.trimStart().startsWith("<")) {
    throw new Error("Remote API returned HTML instead of JSON");
  }
  return JSON.parse(text) as T;
}
