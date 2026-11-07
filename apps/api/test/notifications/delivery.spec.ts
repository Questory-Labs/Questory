import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, lookup } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  lookup: vi.fn(async () => [{ address: "162.159.135.232", family: 4 }]),
}));
vi.mock("node:dns/promises", () => ({ lookup, default: { lookup } }));

import {
  NotificationDeliveryService,
  channelMatches,
} from "../../src/notifications/delivery/notification-delivery.service";
import { encryptSecret } from "../../src/lib/secret-crypto";
import type { PrismaService } from "../../src/prisma/prisma.service";

const message = { type: "deal", title: "Deal", body: "Buy", href: "/wishlist" };

function channel(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    userId: "u1",
    kind: "discord",
    config: encryptSecret(
      JSON.stringify({ webhookUrl: "https://discord.com/api/webhooks/123456789/abcdefgh" }),
    ),
    types: '["*"]',
    enabled: true,
    ...overrides,
  };
}

function make(channels: ReturnType<typeof channel>[], opts: { killed?: boolean } = {}) {
  const update = vi.fn().mockResolvedValue({});
  const prisma = {
    appConfig: {
      findUnique: vi.fn().mockResolvedValue(opts.killed ? { value: "false" } : null),
    },
    notificationChannel: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: { enabled?: boolean; id?: string } }) =>
        channels.filter(
          (c) => (where.enabled === undefined || c.enabled === where.enabled) && (!where.id || c.id === where.id),
        ),
      ),
      update,
    },
  } as unknown as PrismaService;
  const findMany = (prisma as unknown as { notificationChannel: { findMany: ReturnType<typeof vi.fn> } })
    .notificationChannel.findMany;
  return { service: new NotificationDeliveryService(prisma), update, findMany };
}

describe("channelMatches", () => {
  it("matches wildcard and explicit types only", () => {
    expect(channelMatches('["*"]', "deal")).toBe(true);
    expect(channelMatches('["deal"]', "deal")).toBe(true);
    expect(channelMatches('["monthly-recap"]', "deal")).toBe(false);
    expect(channelMatches("garbage", "deal")).toBe(false);
  });
});

describe("NotificationDeliveryService", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends only to enabled channels subscribed to the type and records lastSentAt", async () => {
    const { service, update, findMany } = make([
      channel(),
      channel({ id: "c2", enabled: false }),
      channel({ id: "c3", types: '["monthly-recap"]' }),
    ]);
    await service.dispatch("u1", message);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("discord.com/api/webhooks");
    expect(update).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toMatchObject({ verifiedAt: { not: null } });
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: "c1" },
      data: { lastError: null },
    });
  });

  it("does nothing when the admin kill switch is off", async () => {
    const { service } = make([channel()], { killed: true });
    await service.dispatch("u1", message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records provider failures as lastError and never throws from dispatch", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const { service, update } = make([channel()]);
    await expect(service.dispatch("u1", message)).resolves.toBeUndefined();
    expect(update.mock.calls[0][0].data.lastError).toBe("Discord webhook HTTP 404");
  });

  it("marks a hung provider as timed out", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_, reject) =>
          init.signal.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    );
    const { service, update } = make([channel()]);
    const run = expect(service.sendToChannel(channel(), message)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_001);
    await run;
    expect(update.mock.calls[0][0].data.lastError).toBe("Timed out");
  });

  it("refuses email when SMTP is not configured", async () => {
    process.env.SMTP_URL = "";
    const { service, update } = make([
      channel({ kind: "email", config: encryptSecret(JSON.stringify({ address: "a@b.co" })) }),
    ]);
    await service.dispatch("u1", message);
    expect(update.mock.calls[0][0].data.lastError).toMatch(/not configured/);
    expect(service.availableKinds()).toEqual(["discord", "ntfy"]);
  });
});
