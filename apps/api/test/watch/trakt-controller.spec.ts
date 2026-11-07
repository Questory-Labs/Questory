import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { BadRequestException, RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";
import type { Response } from "express";
import { TraktController } from "../../src/watch/trakt/trakt.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { TraktService } from "../../src/watch/trakt/trakt.service";

function responseStub() {
  const res = {
    redirect: vi.fn(),
    status: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

function setup() {
  const trakt = {
    getConnection: vi.fn().mockResolvedValue({ connected: false }),
    authUrl: vi.fn((state: string) => `https://trakt.tv/oauth/authorize?state=${state}`),
    exchangeCode: vi.fn().mockResolvedValue({ ok: true, userId: "u-1" }),
    disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
  };
  const controller = new TraktController(trakt as unknown as TraktService);
  return { controller, trakt };
}

const asRes = (res: ReturnType<typeof responseStub>) => res as unknown as Response;

describe("TraktController", () => {
  const savedWeb = process.env.WEB_ORIGIN;
  const savedPublic = process.env.NEXT_PUBLIC_WEB_URL;

  beforeEach(() => {
    delete process.env.WEB_ORIGIN;
    delete process.env.NEXT_PUBLIC_WEB_URL;
  });

  afterEach(() => {
    if (savedWeb === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = savedWeb;
    if (savedPublic === undefined) delete process.env.NEXT_PUBLIC_WEB_URL;
    else process.env.NEXT_PUBLIC_WEB_URL = savedPublic;
  });

  describe("route protection", () => {
    const guards = (name: "status" | "authorize" | "callback" | "disconnect") =>
      Reflect.getMetadata(GUARDS_METADATA, TraktController.prototype[name]) ?? [];

    it.each(["status", "authorize", "disconnect"] as const)(
      "guards %s with the session user guard",
      (name) => {
        expect(guards(name)).toContain(SessionUserGuard);
      },
    );

    it("leaves the OAuth callback unguarded because the state authenticates it", () => {
      expect(guards("callback")).toEqual([]);
    });

    it("mounts under watch/trakt with DELETE at the root", () => {
      expect(Reflect.getMetadata(PATH_METADATA, TraktController)).toBe("watch/trakt");
      expect(
        Reflect.getMetadata(METHOD_METADATA, TraktController.prototype.disconnect),
      ).toBe(RequestMethod.DELETE);
    });
  });

  it("returns status for the session user", async () => {
    const { controller, trakt } = setup();
    await expect(controller.status("u-1")).resolves.toEqual({ connected: false });
    expect(trakt.getConnection).toHaveBeenCalledWith("u-1");
  });

  it("disconnects the session user", async () => {
    const { controller, trakt } = setup();
    await expect(controller.disconnect("u-1")).resolves.toEqual({
      ok: true,
      disconnected: true,
    });
    expect(trakt.disconnect).toHaveBeenCalledWith("u-1");
  });

  describe("authorize", () => {
    it("redirects with a signed state bound to the session user", () => {
      const { controller, trakt } = setup();
      const res = responseStub();
      controller.authorize(asRes(res), "u-1");

      const state = trakt.authUrl.mock.calls[0]![0];
      expect(verifyOAuthState(state)?.userId).toBe("u-1");
      expect(res.redirect).toHaveBeenCalledWith(
        `https://trakt.tv/oauth/authorize?state=${state}`,
      );
    });

    it("propagates a not-configured error without redirecting", () => {
      const { controller, trakt } = setup();
      trakt.authUrl.mockImplementation(() => {
        throw new BadRequestException("not configured");
      });
      const res = responseStub();
      expect(() => controller.authorize(asRes(res), "u-1")).toThrow(BadRequestException);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe("callback", () => {
    it("answers 400 for a missing code before touching state", async () => {
      const { controller, trakt } = setup();
      const res = responseStub();
      await controller.callback("", signOAuthState("u-1"), asRes(res));
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing code");
      expect(trakt.exchangeCode).not.toHaveBeenCalled();
    });

    it("exchanges for the user named by the verified state", async () => {
      const { controller, trakt } = setup();
      const res = responseStub();
      await controller.callback("code", signOAuthState("state-user"), asRes(res));
      expect(trakt.exchangeCode).toHaveBeenCalledWith("code", "state-user");
    });

    it.each([
      ["missing", () => undefined],
      ["empty", () => ""],
      ["garbage", () => "not-a-state"],
      ["unsigned", () => signOAuthState("u-1").split(".")[0]],
      [
        "tampered user",
        () => {
          const [, sig] = signOAuthState("u-1").split(".");
          const forged = Buffer.from(
            JSON.stringify({ userId: "attacker", nonce: "n", exp: Date.now() + 60_000 }),
          ).toString("base64url");
          return `${forged}.${sig}`;
        },
      ],
      ["signed with another secret", () => signOAuthState("u-1", { secret: "other-secret-other-secret-123456" })],
      ["expired", () => signOAuthState("u-1", { ttlMs: -1000 })],
    ])("rejects a %s state without exchanging", async (_name, state) => {
      const { controller, trakt } = setup();
      const res = responseStub();
      await expect(
        controller.callback("code", state(), asRes(res)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(trakt.exchangeCode).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("does not redirect when the exchange fails", async () => {
      const { controller, trakt } = setup();
      trakt.exchangeCode.mockRejectedValue(new BadRequestException("nope"));
      const res = responseStub();
      await expect(
        controller.callback("code", signOAuthState("u-1"), asRes(res)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("redirects to the default web origin", async () => {
      const { controller } = setup();
      const res = responseStub();
      await controller.callback("code", signOAuthState("u-1"), asRes(res));
      expect(res.redirect).toHaveBeenCalledWith(
        "http://localhost:3000/sources?tab=watch&trakt=connected",
      );
    });

    it("prefers WEB_ORIGIN and strips a trailing slash", async () => {
      process.env.WEB_ORIGIN = "https://app.example/";
      process.env.NEXT_PUBLIC_WEB_URL = "https://other.example";
      const { controller } = setup();
      const res = responseStub();
      await controller.callback("code", signOAuthState("u-1"), asRes(res));
      expect(res.redirect).toHaveBeenCalledWith(
        "https://app.example/sources?tab=watch&trakt=connected",
      );
    });

    it("falls back to NEXT_PUBLIC_WEB_URL", async () => {
      process.env.NEXT_PUBLIC_WEB_URL = "https://public.example";
      const { controller } = setup();
      const res = responseStub();
      await controller.callback("code", signOAuthState("u-1"), asRes(res));
      expect(res.redirect).toHaveBeenCalledWith(
        "https://public.example/sources?tab=watch&trakt=connected",
      );
    });
  });
});
