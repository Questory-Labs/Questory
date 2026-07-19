import { describe, expect, it, afterEach } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { SessionUserGuard } from "../../src/auth/session-user.guard";
import { encodeSessionCookie } from "@questorylabs/shared/session";

describe("music SessionUserGuard", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  function makeContext(cookies: Record<string, string> = {}) {
    const req: { cookies?: Record<string, string>; musicUserId?: string } = {
      cookies,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      req,
    };
  }

  it("accepts valid session cookie", async () => {
    process.env.APP_MODE = "production";
    const cookie = encodeSessionCookie({
      userId: "u1",
      steamId: "76561198000000000",
    });
    const ctx = makeContext({ questorylabs_session: cookie });
    const guard = new SessionUserGuard({
      resolveSoleUser: async () => null,
    } as any);
    await expect(
      guard.canActivate(ctx as any),
    ).resolves.toBe(true);
    expect(ctx.req.musicUserId).toBe("u1");
  });

  it("rejects missing session outside sole-user modes", async () => {
    process.env.APP_MODE = "production";
    const ctx = makeContext();
    const guard = new SessionUserGuard({
      resolveSoleUser: async () => ({ id: "sole" }),
    } as any);
    await expect(guard.canActivate(ctx as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("allows sole-user fallback in local", async () => {
    process.env.APP_MODE = "local";
    const ctx = makeContext();
    const guard = new SessionUserGuard({
      resolveSoleUser: async () => ({ id: "sole" }),
    } as any);
    await expect(guard.canActivate(ctx as any)).resolves.toBe(true);
    expect(ctx.req.musicUserId).toBe("sole");
  });
});
