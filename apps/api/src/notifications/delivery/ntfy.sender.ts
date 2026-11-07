import type { NtfyChannelConfig } from "@questorylabs/shared";
import { postToPublicUrl } from "../../lib/outbound-url-guard";
import { absoluteHref, type DeliveryMessage } from "./notification-delivery.constants";

const asciiHeader = (value: string) => value.replace(/[^\x20-\x7e]/g, "?").slice(0, 200);

export function ntfyRequest(config: NtfyChannelConfig, message: DeliveryMessage) {
  const server = (config.server || "https://ntfy.sh").replace(/\/+$/, "");
  const headers: Record<string, string> = {
    Title: asciiHeader(message.title),
    Tags: "video_game",
  };
  const url = absoluteHref(message.href);
  if (url) headers.Click = url;
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  return {
    url: `${server}/${encodeURIComponent(config.topic)}`,
    headers,
    body: message.body || message.title,
  };
}

export async function sendNtfy(
  config: NtfyChannelConfig,
  message: DeliveryMessage,
  signal: AbortSignal,
): Promise<void> {
  const req = ntfyRequest(config, message);
  const res = await postToPublicUrl(req.url, { headers: req.headers, body: req.body, signal });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`);
}
