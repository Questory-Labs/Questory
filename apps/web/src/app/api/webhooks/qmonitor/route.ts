import { proxyToApi } from "@/lib/qmonitor-api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/webhooks/qmonitor", request);
}
