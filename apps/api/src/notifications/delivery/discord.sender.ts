import type { DiscordChannelConfig } from "@questorylabs/shared";
import { postToPublicUrl } from "../../lib/outbound-url-guard";
import { absoluteHref, type DeliveryMessage } from "./notification-delivery.constants";

export function discordPayload(message: DeliveryMessage) {
  const url = absoluteHref(message.href);
  return {
    username: "Questory",
    embeds: [
      {
        title: message.title.slice(0, 256),
        description: (message.body || "").slice(0, 2048),
        ...(url ? { url } : {}),
        color: 0x7c5cff,
      },
    ],
  };
}

export async function sendDiscord(
  config: DiscordChannelConfig,
  message: DeliveryMessage,
  signal: AbortSignal,
): Promise<void> {
  const res = await postToPublicUrl(config.webhookUrl, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discordPayload(message)),
    signal,
  });
  if (!res.ok) throw new Error(`Discord webhook HTTP ${res.status}`);
}
