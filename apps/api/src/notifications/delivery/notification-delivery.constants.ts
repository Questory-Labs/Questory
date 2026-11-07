export const NOTIFICATION_DELIVERY_ENABLED_KEY = "notifications.delivery.enabled";
export const NOTIFICATION_DELIVERY_QUEUE = "notification-delivery";
export const NOTIFICATION_DELIVERY_TIMEOUT_MS = 10_000;
export const NOTIFICATION_CHANNEL_LIMIT = 10;
export const NOTIFICATION_TEST_LIMIT = { max: 5, windowSeconds: 600 } as const;
export const NOTIFICATION_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const NOTIFICATION_VERIFY_IP_LIMIT = { max: 20, windowSeconds: 600 } as const;
export const SYNC_FAILED_DEDUPE_MS = 24 * 60 * 60 * 1000;

export type DeliveryMessage = {
  type: string;
  title: string;
  body: string | null;
  href: string | null;
};

export function smtpConfigured(): boolean {
  return Boolean((process.env.SMTP_URL || "").trim());
}

export function publicWebUrl(): string {
  const raw =
    (process.env.PUBLIC_WEB_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_WEB_URL || "").trim() ||
    (process.env.WEB_ORIGIN || "").trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteHref(href: string | null): string | null {
  if (!href) return null;
  if (/^https?:\/\//.test(href)) return href;
  return `${publicWebUrl()}${href.startsWith("/") ? "" : "/"}${href}`;
}
