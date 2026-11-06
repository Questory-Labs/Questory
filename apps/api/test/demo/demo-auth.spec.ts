import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EMAIL, DEMO_SESSION_TTL_MS, DEMO_USER_ID } from "@questorylabs/shared";
import {
  SESSION_COOKIE_NAME,
  parseSessionCookie,
} from "@questorylabs/shared/session";
import { AdminService } from "../../src/admin/admin.service";
import { AuthAbuseService } from "../../src/auth/abuse/auth-abuse.service";
import { AuthController } from "../../src/auth/auth.controller";
import { AuthService } from "../../src/auth/auth.service";
import { CacheService } from "../../src/cache/cache.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const ORIGIN = "http://demo-origin.test";

function makeReq(ip: string, origin: string | undefined = ORIGIN) {
  return {
    headers: origin ? { origin } : {},
    ip,
    socket: { remoteAddress: ip },
  } as never;
}

function makeRes() {
  return { cookie: vi.fn() };
}

describe("POST /auth/demo", () => {
  const isDemoEnabled = vi.fn();
  let controller: AuthController;

  beforeEach(() => {
    process.env.WEB_ORIGIN = ORIGIN;
    isDemoEnabled.mockReset().mockResolvedValue(true);
    controller = new AuthController(
      {} as never,
      new AuthAbuseService(new CacheService()),
      { isDemoEnabled } as never,
    );
  });

  it("returns 404 and no cookie when the flag is off", async () => {
    isDemoEnabled.mockResolvedValue(false);
    const res = makeRes();
    const err = await controller
      .demo(makeReq("10.1.0.1"), res as never)
      .catch((e) => e);
    expect(err.getStatus()).toBe(404);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("rejects a missing or foreign origin", async () => {
    for (const origin of [undefined, "https://evil.example"]) {
      const res = makeRes();
      const req = origin
        ? makeReq("10.1.0.2", origin)
        : ({ headers: {}, ip: "10.1.0.2" } as never);
      const err = await controller.demo(req, res as never).catch((e) => e);
      expect(err.getStatus()).toBe(403);
      expect(res.cookie).not.toHaveBeenCalled();
    }
  });

  it("issues a one hour demo cookie without renewal fields", async () => {
    const res = makeRes();
    const before = Date.now();
    const body = await controller.demo(makeReq("10.1.0.3"), res as never);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [name, value, options] = res.cookie.mock.calls[0]!;
    expect(name).toBe(SESSION_COOKIE_NAME);
    const session = parseSessionCookie(value);
    expect(session).toMatchObject({
      userId: DEMO_USER_ID,
      steamId: null,
      demo: true,
    });
    expect(session!.exp).toBeGreaterThanOrEqual(before + DEMO_SESSION_TTL_MS);
    expect(session!.exp).toBeLessThanOrEqual(Date.now() + DEMO_SESSION_TTL_MS);
    expect(options.maxAge).toBeLessThanOrEqual(DEMO_SESSION_TTL_MS);
    expect(options.maxAge).toBeGreaterThan(DEMO_SESSION_TTL_MS - 5000);
    expect(body.user).toMatchObject({
      email: DEMO_EMAIL,
      isAdmin: false,
      isDemo: true,
    });
  });

  it("rate limits by IP only", async () => {
    let limited: { getStatus(): number } | undefined;
    for (let i = 0; i < 21 && !limited; i++) {
      await controller
        .demo(makeReq("10.1.0.4"), makeRes() as never)
        .catch((e) => {
          limited = e;
        });
    }
    expect(limited?.getStatus()).toBe(429);
    await expect(
      controller.demo(makeReq("10.1.0.5"), makeRes() as never),
    ).resolves.toMatchObject({ ok: true });
  });

  it("limits demo API requests per IP", async () => {
    const abuse = new AuthAbuseService(new CacheService());
    for (let i = 0; i < 600; i++) {
      await abuse.assertDemoRequestLimits("10.1.0.6");
    }
    await expect(abuse.assertDemoRequestLimits("10.1.0.6")).rejects.toMatchObject({
      status: 429,
    });
    await expect(abuse.assertDemoRequestLimits("10.1.0.7")).resolves.toBeUndefined();
  });
});

describe("reserved demo email", () => {
  const VARIANTS = [DEMO_EMAIL, DEMO_EMAIL.toUpperCase(), `  ${DEMO_EMAIL} `];
  const prisma = {
    user: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    appConfig: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  const none = {} as never;

  beforeEach(() => {
    prisma.user.findUnique.mockClear();
    prisma.user.create.mockClear();
    prisma.user.update.mockClear();
  });

  const auth = () =>
    new AuthService(prisma as unknown as PrismaService, none, none, none);
  const admin = () =>
    new AdminService(
      prisma as unknown as PrismaService,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
    );

  it.each(VARIANTS)("register refuses %s", async (email) => {
    const err = await auth()
      .register(email, "a-long-password")
      .catch((e) => e);
    expect(err.getStatus()).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(VARIANTS)("login refuses %s without a lookup", async (email) => {
    const err = await auth()
      .login(email, "a-long-password")
      .catch((e) => e);
    expect(err.getStatus()).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each(VARIANTS)("admin create refuses %s", async (email) => {
    const err = await admin()
      .createUser({ personaName: "x", email, password: "a-long-password" })
      .catch((e) => e);
    expect(err.getStatus()).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(VARIANTS)("admin patch refuses %s", async (email) => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "target-id" });
    const err = await admin()
      .patchUser("target-id", { email })
      .catch((e) => e);
    expect(err.getStatus()).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
