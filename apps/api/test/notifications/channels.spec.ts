import { describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));
vi.mock("node:dns/promises", () => ({ lookup, default: { lookup } }));

import { HttpException, NotFoundException } from "@nestjs/common";
import {
  NotificationChannelsService,
  redactTarget,
} from "../../src/notifications/notification-channels.service";
import { decryptSecret } from "../../src/lib/secret-crypto";
import { hashApiToken } from "../../src/accounts/accounts.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

function make(opts: { hits?: number; smtp?: boolean } = {}) {
  const created: Record<string, unknown>[] = [];
  const prisma = {
    notificationChannel: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...created[0], ...data })),
      create: vi.fn().mockImplementation(async ({ data }) => {
        created.push(data);
        return {
          id: "c1",
          label: null,
          lastSentAt: null,
          lastError: null,
          createdAt: new Date("2026-11-01T00:00:00Z"),
          ...data,
        };
      }),
    },
  } as unknown as PrismaService;
  const cache = { incr: vi.fn().mockResolvedValue(opts.hits ?? 1) } as never;
  const delivery = {
    availableKinds: () => (opts.smtp ? ["discord", "ntfy", "email"] : ["discord", "ntfy"]),
    isEnabled: async () => true,
    sendToChannel: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  };
  return {
    service: new NotificationChannelsService(prisma, cache, delivery as never),
    created,
    prisma: prisma as unknown as {
      notificationChannel: Record<string, ReturnType<typeof vi.fn>>;
    },
    delivery,
  };
}

describe("redactTarget", () => {
  it("never echoes secrets", () => {
    expect(
      redactTarget({
        kind: "discord",
        config: { webhookUrl: "https://discord.com/api/webhooks/123456789/SECRETTOKENxyz" },
      }),
    ).toBe("discord.com/…/1234…6789");
    expect(
      redactTarget({ kind: "ntfy", config: { server: "https://ntfy.sh", topic: "t1", token: "tok" } }),
    ).toBe("ntfy.sh/t1");
    expect(redactTarget({ kind: "email", config: { address: "santosh@example.com" } })).toBe(
      "sa…@example.com",
    );
  });
});

describe("NotificationChannelsService", () => {
  it("encrypts config at rest and returns a redacted target", async () => {
    const { service, created } = make();
    const out = await service.create("u1", {
      kind: "ntfy",
      config: { server: "https://ntfy.sh", topic: "questory", token: "tok_secret" },
      types: ["*"],
      label: null,
    });
    const stored = String(created[0]!.config);
    expect(stored.startsWith("enc:v1:")).toBe(true);
    expect(stored).not.toContain("tok_secret");
    expect(JSON.parse(decryptSecret(stored)).token).toBe("tok_secret");
    expect(out.target).toBe("ntfy.sh/questory");
    expect(JSON.stringify(out)).not.toContain("tok_secret");
  });

  it("rejects ntfy servers that resolve to private addresses", async () => {
    lookup.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);
    const { service, created } = make();
    await expect(
      service.create("u1", {
        kind: "ntfy",
        config: { server: "https://ntfy.internal", topic: "t" },
        types: ["*"],
        label: null,
      }),
    ).rejects.toThrow(/not allowed/);
    expect(created).toHaveLength(0);
  });

  it("rejects email channels when SMTP is unavailable", async () => {
    const { service } = make();
    await expect(
      service.create("u1", { kind: "email", config: { address: "a@b.co" }, types: ["*"], label: null }),
    ).rejects.toThrow(/not available/);
  });

  it("marks non-email channels verified on create", async () => {
    const { service, created, delivery } = make();
    const out = await service.create("u1", {
      kind: "ntfy",
      config: { server: "https://ntfy.sh", topic: "q" },
      types: ["*"],
      label: null,
    });
    expect(created[0]!.verifiedAt).toBeInstanceOf(Date);
    expect(out.verified).toBe(true);
    expect(delivery.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("creates email channels unverified and mails a hashed one-time link", async () => {
    const { service, created, delivery } = make({ smtp: true });
    const out = await service.create("u1", {
      kind: "email",
      config: { address: "me@example.com" },
      types: ["*"],
      label: null,
    });
    expect(out.verified).toBe(false);
    const data = created[0]!;
    expect(data.verifiedAt).toBeNull();
    expect(data.verifyExpiresAt).toBeInstanceOf(Date);
    const token = delivery.sendVerificationEmail.mock.calls[0]![1] as string;
    expect(data.verifyTokenHash).toBe(hashApiToken(token));
    expect(JSON.stringify(data)).not.toContain(token);
  });

  it("reports a failed verification send without dropping the channel", async () => {
    const { service, delivery } = make({ smtp: true });
    delivery.sendVerificationEmail.mockRejectedValueOnce(new Error("SMTP down"));
    const out = await service.create("u1", {
      kind: "email",
      config: { address: "me@example.com" },
      types: ["*"],
      label: null,
    });
    expect(out.lastError).toBe("SMTP down");
    expect(out.verified).toBe(false);
  });

  it("verifies a valid link once and clears the token", async () => {
    const { service, prisma } = make();
    prisma.notificationChannel.findUnique!.mockResolvedValueOnce({
      id: "c1",
      verifyExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.verify("t".repeat(43), "1.2.3.4")).resolves.toEqual({ ok: true });
    expect(prisma.notificationChannel.findUnique!.mock.calls[0]![0].where).toEqual({
      verifyTokenHash: hashApiToken("t".repeat(43)),
    });
    expect(prisma.notificationChannel.update!.mock.calls[0]![0].data).toMatchObject({
      verifyTokenHash: null,
      verifyExpiresAt: null,
    });
    expect(prisma.notificationChannel.update!.mock.calls[0]![0].data.verifiedAt).toBeInstanceOf(Date);
  });

  it("rejects unknown and expired links, and rate limits by ip", async () => {
    const { service, prisma } = make();
    await expect(service.verify("t".repeat(43), "1.2.3.4")).rejects.toBeInstanceOf(NotFoundException);
    prisma.notificationChannel.findUnique!.mockResolvedValueOnce({
      id: "c1",
      verifyExpiresAt: new Date(Date.now() - 1),
    });
    await expect(service.verify("t".repeat(43), "1.2.3.4")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notificationChannel.update).not.toHaveBeenCalled();
    const limited = make({ hits: 21 });
    await expect(limited.service.verify("t".repeat(43), "1.2.3.4")).rejects.toBeInstanceOf(HttpException);
    expect(limited.prisma.notificationChannel.findUnique).not.toHaveBeenCalled();
  });

  it("refuses test sends and resends a fresh link for unverified email", async () => {
    const { service, prisma, delivery } = make({ smtp: true });
    const row = {
      id: "c1",
      userId: "u1",
      kind: "email",
      verifiedAt: null,
      verifyTokenHash: "old",
      config: "x",
      types: "[\"*\"]",
      enabled: true,
    };
    prisma.notificationChannel.findFirst!.mockResolvedValue(row);
    prisma.notificationChannel.update!.mockImplementation(async ({ data }) => ({ ...row, ...data }));
    expect(await service.test("u1", "c1")).toEqual({
      ok: false,
      error: "Confirm this email address first",
    });
    expect(delivery.sendToChannel).not.toHaveBeenCalled();
    expect(await service.resendVerification("u1", "c1")).toEqual({ ok: true, error: null });
    const newHash = prisma.notificationChannel.update!.mock.calls[0]![0].data.verifyTokenHash;
    expect(newHash).not.toBe("old");
    expect(newHash).toBe(hashApiToken(delivery.sendVerificationEmail.mock.calls[0]![1] as string));
  });

  it("rate limits test sends per user", async () => {
    const { service } = make({ hits: 6 });
    await expect(service.test("u1", "c1")).rejects.toBeInstanceOf(HttpException);
  });
});
