import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailerService } from "../mail/mailer.service";
import {
  magicLinkContent,
  resetPasswordContent,
  verifyEmailContent,
} from "../mail/mail.templates";
import { isSignupOpen } from "./signup-policy";
import { EmailTokenService } from "./email-token.service";
import { AccountsService } from "../accounts/accounts.service";
import { isAdminEmail } from "./admin-emails";
import { normalizeEmail } from "./abuse/disposable-emails";
import { hashPassword } from "./password";

function apiOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.STEAM_REALM ||
    `http://localhost:${process.env.API_PORT || 4000}`
  ).replace(/\/$/, "");
}

function webOrigin(): string {
  return (process.env.WEB_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly tokens: EmailTokenService,
    private readonly accounts: AccountsService,
  ) {}

  assertActive(): void {
    if (!this.mailer.isActive()) {
      throw new ForbiddenException({
        code: "mail_disabled",
        message: "Mail is not configured",
      });
    }
  }

  async sendVerifyForUser(userId: string): Promise<void> {
    this.assertActive();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || user.emailVerifiedAt) return;
    const issued = await this.tokens.issue({
      email: user.email,
      purpose: "verify",
      userId: user.id,
    });
    const href = `${apiOrigin()}/auth/verify/callback?token=${encodeURIComponent(issued.raw)}`;
    const content = verifyEmailContent(href);
    await this.mailer.send({ to: user.email, ...content });
  }

  async consumeVerify(raw: string) {
    this.assertActive();
    const consumed = await this.tokens.consume(raw, "verify");
    if (!consumed?.userId) {
      throw new UnauthorizedException("Invalid or expired link");
    }
    const user = await this.prisma.user.update({
      where: { id: consumed.userId },
      data: { emailVerifiedAt: new Date() },
    });
    const steamId = await this.accounts.getSteamId(user.id);
    return { ...user, steamId };
  }

  async requestMagic(emailRaw: string): Promise<void> {
    this.assertActive();
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.disabledAt) return;
    if (!user) {
      const open = await isSignupOpen(this.prisma);
      if (!open) return;
    }

    const issued = await this.tokens.issue({
      email,
      purpose: "magic",
      userId: user?.id ?? null,
    });
    const href = `${apiOrigin()}/auth/magic/callback?token=${encodeURIComponent(issued.raw)}`;
    const content = magicLinkContent(href);
    try {
      await this.mailer.send({ to: email, ...content });
    } catch (err) {
      this.logger.warn(
        `Magic-link send failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async consumeMagic(raw: string) {
    this.assertActive();
    const consumed = await this.tokens.consume(raw, "magic");
    if (!consumed) {
      throw new UnauthorizedException("Invalid or expired link");
    }

    let user = consumed.userId
      ? await this.prisma.user.findUnique({ where: { id: consumed.userId } })
      : await this.prisma.user.findUnique({ where: { email: consumed.email } });

    if (!user) {
      const open = await isSignupOpen(this.prisma);
      if (!open) {
        throw new UnauthorizedException("Invalid or expired link");
      }
      const local = consumed.email.split("@")[0] || "user";
      user = await this.prisma.user.create({
        data: {
          email: consumed.email,
          personaName: local.slice(0, 64),
          isAdmin: isAdminEmail(consumed.email),
          emailVerifiedAt: new Date(),
        },
      });
    } else if (user.disabledAt) {
      throw new UnauthorizedException("Invalid or expired link");
    } else if (!user.emailVerifiedAt) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    const steamId = await this.accounts.getSteamId(user.id);
    return { ...user, steamId };
  }

  async requestReset(emailRaw: string): Promise<void> {
    this.assertActive();
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || user.disabledAt) return;

    const issued = await this.tokens.issue({
      email,
      purpose: "reset",
      userId: user.id,
    });
    const href = `${webOrigin()}/reset?token=${encodeURIComponent(issued.raw)}`;
    const content = resetPasswordContent(href);
    try {
      await this.mailer.send({ to: email, ...content });
    } catch (err) {
      this.logger.warn(
        `Reset-mail send failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async consumeReset(raw: string, password: string) {
    this.assertActive();
    const consumed = await this.tokens.consume(raw, "reset");
    if (!consumed?.userId) {
      throw new UnauthorizedException("Invalid or expired link");
    }
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.update({
      where: { id: consumed.userId },
      data: {
        passwordHash,
        emailVerifiedAt: new Date(),
        sessionEpoch: { increment: 1 },
      },
    });
    const steamId = await this.accounts.getSteamId(user.id);
    return { ...user, steamId };
  }
}
