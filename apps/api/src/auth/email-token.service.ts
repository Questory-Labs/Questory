import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type EmailTokenPurpose = "verify" | "magic" | "reset";

export type IssuedEmailToken = {
  raw: string;
  expiresAt: Date;
};

export type ConsumedEmailToken = {
  id: string;
  userId: string | null;
  email: string;
  purpose: EmailTokenPurpose;
};

const TTL_MS: Record<EmailTokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000,
  magic: 15 * 60 * 1000,
  reset: 15 * 60 * 1000,
};

export function hashEmailToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newEmailToken(): string {
  return randomBytes(32).toString("base64url");
}

@Injectable()
export class EmailTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(opts: {
    email: string;
    purpose: EmailTokenPurpose;
    userId?: string | null;
  }): Promise<IssuedEmailToken> {
    const raw = newEmailToken();
    const tokenHash = hashEmailToken(raw);
    const expiresAt = new Date(Date.now() + TTL_MS[opts.purpose]);

    await this.prisma.emailToken.updateMany({
      where: {
        email: opts.email,
        purpose: opts.purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    await this.prisma.emailToken.create({
      data: {
        email: opts.email,
        purpose: opts.purpose,
        tokenHash,
        expiresAt,
        userId: opts.userId ?? null,
      },
    });

    return { raw, expiresAt };
  }

  async consume(
    raw: string,
    purpose: EmailTokenPurpose,
  ): Promise<ConsumedEmailToken | null> {
    const tokenHash = hashEmailToken(raw);
    const row = await this.prisma.emailToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.purpose !== purpose) return null;
    if (row.consumedAt) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;

    await this.prisma.emailToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    return {
      id: row.id,
      userId: row.userId,
      email: row.email,
      purpose: purpose,
    };
  }
}
