import { createTransport, type Transporter } from "nodemailer";
import { Injectable, Logger } from "@nestjs/common";
import {
  isMailerActive,
  resolveSmtpConfig,
  type SmtpStatus,
} from "./smtp-config";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transport: Transporter | null = null;

  isActive(): boolean {
    return isMailerActive();
  }

  status(): SmtpStatus {
    const resolved = resolveSmtpConfig();
    return {
      configured: resolved.configured,
      enabled: resolved.enabled,
      active: resolved.active,
      config: null,
    };
  }

  async send(message: MailMessage): Promise<void> {
    const resolved = resolveSmtpConfig();
    if (!resolved.active || !resolved.config) {
      throw new Error("mail_disabled");
    }
    const transport = this.getTransport();
    await transport.sendMail({
      from: resolved.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private getTransport(): Transporter {
    if (this.transport) return this.transport;
    const resolved = resolveSmtpConfig();
    if (!resolved.config) {
      throw new Error("mail_disabled");
    }
    this.transport = createTransport({
      host: resolved.config.host,
      port: resolved.config.port,
      secure: resolved.config.secure,
      auth:
        resolved.config.user && resolved.config.pass
          ? { user: resolved.config.user, pass: resolved.config.pass }
          : undefined,
    });
    this.logger.log(
      `SMTP transport ready (${resolved.config.host}:${resolved.config.port})`,
    );
    return this.transport;
  }
}
