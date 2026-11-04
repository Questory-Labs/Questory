import {
  QHttp,
  isQHttpError,
  type HttpAdapter,
  type FinalRequest,
  type RawResponseLike,
  type HttpMethod,
  type RequestBody,
} from "@questorylabs/qhttp";
import { jsonRequestHeaders } from "@/lib/json-fetch";

/** Session cookie fetch — credentials + no-store (not qHttp TTL cache). */
class SessionFetchAdapter implements HttpAdapter {
  async send(request: FinalRequest): Promise<RawResponseLike> {
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      credentials: "include",
      cache: "no-store",
    };
    if (request.duplex) init.duplex = request.duplex;

    const response = await fetch(request.url, init);
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

const sessionAdapter = new SessionFetchAdapter();

export const sessionHttp = new QHttp({
  throwOnError: true,
  adapter: sessionAdapter,
  responseType: "json",
}).setRetry({ retries: 2, backoff: "exponential", jitter: true });

export type MappedHttpError = Error & {
  status?: number;
  data?: unknown;
  requestId?: string;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

function headerValue(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function serverRequestId(
  headers: Record<string, string> | undefined,
  data: unknown,
): string | undefined {
  const fromHeader = headerValue(headers, "x-request-id");
  const fromBody =
    data && typeof data === "object"
      ? (data as { requestId?: unknown }).requestId
      : undefined;
  const id =
    fromHeader ?? (typeof fromBody === "string" ? fromBody : undefined);
  return id && REQUEST_ID_PATTERN.test(id) ? id : undefined;
}

export function mapQHttpError(err: unknown): MappedHttpError {
  if (isQHttpError(err)) {
    const message =
      typeof err.message === "string" && err.message.length > 0
        ? err.message
        : `Request failed: ${err.httpStatus ?? "unknown"}`;
    const mapped = new Error(message) as MappedHttpError;
    if (typeof err.httpStatus === "number") mapped.status = err.httpStatus;
    const data = err.result?.data;
    if (data !== undefined) mapped.data = data;
    const requestId = serverRequestId(err.result?.headers, data);
    if (requestId) mapped.requestId = requestId;
    return mapped;
  }
  if (err instanceof Error) return err as MappedHttpError;
  return new Error("Request failed") as MappedHttpError;
}

export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  return requestJsonWithRetry<T>(url, init, undefined);
}

/** Single attempt — auth probes and other fire-once GETs. */
export async function requestJsonOnce<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  return requestJsonWithRetry<T>(url, init, 0);
}

async function requestJsonWithRetry<T>(
  url: string,
  init: RequestInit,
  retries: number | undefined,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase() as HttpMethod;
  let client = sessionHttp
    .clone()
    .setUrl(url)
    .setHeaders(jsonRequestHeaders(init) as Record<string, string>);

  if (retries !== undefined) {
    client = client.setRetry({ retries });
  }

  if (init.body != null && method !== "GET" && method !== "HEAD") {
    client.setBody(init.body as RequestBody);
  }

  try {
    const result = await client.request<T>({ method });
    return result.data;
  } catch (err) {
    throw mapQHttpError(err);
  }
}

/** Absolute URL GET with short timeout — health probes; null on failure. */
export async function probeJsonSafe<T>(
  url: string,
  timeoutMs = 2500,
): Promise<T | null> {
  try {
    const client = sessionHttp
      .clone()
      .setUrl(url)
      .setTimeout(timeoutMs)
      .setRetry({ retries: 0 });
    const result = await client.throwOnError(false).get<T>();
    if (!result.ok || result.error) return null;
    return result.data;
  } catch {
    return null;
  }
}
