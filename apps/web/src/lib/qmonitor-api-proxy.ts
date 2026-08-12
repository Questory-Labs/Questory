import { getApiUrl } from "@/lib/runtime-env";

/**
 * Forward a machine-token request to Nest. Does not attach browser cookies.
 */
export async function proxyToApi(
  path: string,
  request: Request,
): Promise<Response> {
  const base = getApiUrl().replace(/\/+$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Buffer.from(await request.arrayBuffer());
  }

  const upstream = await fetch(url, init);
  const outHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) outHeaders.set("content-type", upstreamType);

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
