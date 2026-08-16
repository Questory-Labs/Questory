import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthMailService } from "../../src/auth/auth-mail.service";

function mailer(active = true) {
  return {
    isActive: () => active,
    send: vi.fn(async () => undefined),
  };
}

describe("AuthMailService", () => {
  const tokens = {
    issue: vi.fn(async () => ({
      raw: "tok",
      expiresAt: new Date(Date.now() + 60_000),
    })),
    consume: vi.fn(),
  };
  const accounts = { getSteamId: vi.fn(async () => null) };

  beforeEach(() => {
    tokens.issue.mockClear();
    tokens.consume.mockReset();
    accounts.getSteamId.mockClear();
  });

  it("refuses mail routes when SMTP is inactive", () => {
    const service = new AuthMailService(
      {} as never,
      mailer(false) as never,
      tokens as never,
      accounts as never,
    );
    expect(() => service.assertActive()).toThrow(ForbiddenException);
    try {
      service.assertActive();
    } catch (err) {
      const body = (err as ForbiddenException).getResponse();
      expect(JSON.stringify(body)).toContain("mail_disabled");
    }
  });

  it("does not create a user on magic consume when signup is closed", async () => {
    tokens.consume.mockResolvedValue({
      id: "t1",
      userId: null,
      email: "new@example.com",
      purpose: "magic",
    });
    const prisma = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(),
        count: vi.fn(async () => 1),
      },
      appConfig: {
        findUnique: vi.fn(async () => ({ value: "false" })),
      },
    };
    const service = new AuthMailService(
      prisma as never,
      mailer(true) as never,
      tokens as never,
      accounts as never,
    );
    await expect(service.consumeMagic("tok")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates and verifies a user on magic consume when signup is open", async () => {
    tokens.consume.mockResolvedValue({
      id: "t1",
      userId: null,
      email: "new@example.com",
      purpose: "magic",
    });
    const created = {
      id: "u-new",
      email: "new@example.com",
      passwordHash: null,
      sessionEpoch: 0,
      emailVerifiedAt: new Date(),
    };
    const prisma = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => created),
        count: vi.fn(async () => 0),
      },
      appConfig: { findUnique: vi.fn(async () => null) },
    };
    const service = new AuthMailService(
      prisma as never,
      mailer(true) as never,
      tokens as never,
      accounts as never,
    );
    const user = await service.consumeMagic("tok");
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(user.id).toBe("u-new");
  });
});
