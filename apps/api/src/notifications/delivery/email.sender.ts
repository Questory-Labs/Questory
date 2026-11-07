import nodemailer, { type Transporter } from "nodemailer";
import type { EmailChannelConfig } from "@questorylabs/shared";
import {
  NOTIFICATION_DELIVERY_TIMEOUT_MS,
  absoluteHref,
  type DeliveryMessage,
} from "./notification-delivery.constants";

let transporter: Transporter | null = null;
let transporterUrl = "";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function getTransporter(): Transporter {
  const url = (process.env.SMTP_URL || "").trim();
  if (!url) throw new Error("SMTP_URL is not configured");
  if (!transporter || transporterUrl !== url) {
    transporter = nodemailer.createTransport({
      url,
      connectionTimeout: NOTIFICATION_DELIVERY_TIMEOUT_MS,
      greetingTimeout: NOTIFICATION_DELIVERY_TIMEOUT_MS,
      socketTimeout: NOTIFICATION_DELIVERY_TIMEOUT_MS,
    });
    transporterUrl = url;
  }
  return transporter;
}

export function emailMessage(config: EmailChannelConfig, message: DeliveryMessage) {
  const url = absoluteHref(message.href);
  const body = message.body || "";
  const text = [message.title, body, url].filter(Boolean).join("\n\n");
  const html = [
    `<p><strong>${escapeHtml(message.title)}</strong></p>`,
    body ? `<p>${escapeHtml(body)}</p>` : "",
    url ? `<p><a href="${escapeHtml(url)}">Open in Questory</a></p>` : "",
  ].join("");
  return {
    from: (process.env.SMTP_FROM || "").trim() || "Questory <no-reply@localhost>",
    to: config.address,
    subject: `Questory: ${message.title}`.slice(0, 200),
    text,
    html,
  };
}

export async function sendEmail(
  config: EmailChannelConfig,
  message: DeliveryMessage,
): Promise<void> {
  await getTransporter().sendMail(emailMessage(config, message));
}
