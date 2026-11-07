import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";
import type { Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type Guard = abstract new (...args: never[]) => unknown;

type ControllerShape = {
  status(userId: string): unknown;
  disconnect(userId: string): unknown;
};

type OAuthControllerShape = ControllerShape & {
  authorize(res: Response, userId: string): unknown;
  callback(
    code: string,
    state: string | undefined,
    res: Response,
  ): Promise<unknown>;
};

type ConnectControllerShape = ControllerShape & {
  connect(
    userId: string,
    body: { email?: string; password?: string },
  ): unknown;
};

export function guardsOf(
  Controller: { prototype: object },
  method: string,
): unknown[] {
  const handler = (Controller.prototype as Record<string, object>)[method]!;
  return Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
}

function fakeRes() {
  const res = {
    redirect: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    redirect: Mock;
    send: Mock;
    status: Mock;
  };
}

function describeSessionRoutes<C extends ControllerShape>(
  Controller: { prototype: C },
  routes: string[],
  guard: Guard,
  build: (service: Record<string, Mock>) => C,
) {
  it.each(routes)("guards %s with the session guard", (route) => {
    expect(guardsOf(Controller, route)).toEqual([guard]);
  });

  it("passes the session user to status and disconnect", async () => {
    const service = {
      getConnection: vi.fn().mockResolvedValue({ connected: true }),
      disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
    };
    const ctrl = build(service);
    expect(await ctrl.status("u-1")).toEqual({ connected: true });
    expect(service.getConnection).toHaveBeenCalledWith("u-1");
    expect(await ctrl.disconnect("u-1")).toEqual({
      ok: true,
      disconnected: true,
    });
    expect(service.disconnect).toHaveBeenCalledWith("u-1");
  });
}

export function describeConnectController<C extends ConnectControllerShape>(cfg: {
  label: string;
  path: string;
  Controller: { prototype: C };
  guard: Guard;
  build: (service: Record<string, Mock>) => C;
}) {
  describe(`${cfg.label} controller`, () => {
    it("mounts at the expected path", () => {
      expect(Reflect.getMetadata(PATH_METADATA, cfg.Controller)).toBe(cfg.path);
    });

    describeSessionRoutes(
      cfg.Controller,
      ["status", "connect", "disconnect"],
      cfg.guard,
      cfg.build,
    );

    it("forwards credentials with the session user", async () => {
      const connect = vi.fn().mockResolvedValue({ ok: true });
      await cfg
        .build({ connect })
        .connect("u-1", { email: "a@b.c", password: "pw" });
      expect(connect).toHaveBeenCalledWith("a@b.c", "pw", "u-1");
    });

    it("defaults missing credentials to empty strings", async () => {
      const connect = vi.fn().mockResolvedValue({ ok: true });
      await cfg.build({ connect }).connect("u-1", {});
      expect(connect).toHaveBeenCalledWith("", "", "u-1");
    });

    it("ignores a userId smuggled in the body", async () => {
      const connect = vi.fn().mockResolvedValue({ ok: true });
      await cfg.build({ connect }).connect("u-1", {
        email: "a@b.c",
        password: "pw",
        userId: "victim",
      } as { email: string; password: string });
      expect(connect).toHaveBeenCalledWith("a@b.c", "pw", "u-1");
    });
  });
}

export function describeOAuthController<C extends OAuthControllerShape>(cfg: {
  label: string;
  path: string;
  Controller: { prototype: C };
  guard: Guard;
  build: (service: Record<string, Mock>) => C;
  describeRedirects: (run: (ctrl: C) => Promise<string>) => void;
}) {
  describe(`${cfg.label} controller`, () => {
    beforeEach(() => {
      vi.stubEnv("WEB_ORIGIN", "https://app.example");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("mounts at the expected path", () => {
      expect(Reflect.getMetadata(PATH_METADATA, cfg.Controller)).toBe(cfg.path);
    });

    describeSessionRoutes(
      cfg.Controller,
      ["status", "authorize", "disconnect"],
      cfg.guard,
      cfg.build,
    );

    it("leaves the provider callback unguarded", () => {
      expect(guardsOf(cfg.Controller, "callback")).toEqual([]);
    });

    describe("authorize", () => {
      it("redirects with a state bound to the session user", () => {
        const authUrl = vi.fn((state: string) => `https://idp/?state=${state}`);
        const res = fakeRes();
        cfg.build({ authUrl }).authorize(res, "u-1");
        const state = authUrl.mock.calls[0]![0];
        expect(verifyOAuthState(state)?.userId).toBe("u-1");
        expect(res.redirect).toHaveBeenCalledWith(`https://idp/?state=${state}`);
      });

      it("issues a fresh state per request", () => {
        const authUrl = vi.fn((state: string) => state);
        const ctrl = cfg.build({ authUrl });
        ctrl.authorize(fakeRes(), "u-1");
        ctrl.authorize(fakeRes(), "u-1");
        expect(authUrl.mock.calls[0]![0]).not.toBe(authUrl.mock.calls[1]![0]);
      });

      it("does not redirect when the provider is unconfigured", () => {
        const authUrl = vi.fn(() => {
          throw new BadRequestException("not configured");
        });
        const res = fakeRes();
        expect(() => cfg.build({ authUrl }).authorize(res, "u-1")).toThrow(
          BadRequestException,
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });
    });

    describe("callback", () => {
      it("answers 400 when the code is missing", async () => {
        const exchangeCode = vi.fn();
        const res = fakeRes();
        await cfg
          .build({ exchangeCode })
          .callback("", signOAuthState("u-1"), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Missing code");
        expect(exchangeCode).not.toHaveBeenCalled();
      });

      it.each([
        ["missing", () => undefined],
        ["garbage", () => "not-a-state"],
        ["tampered", () => `${signOAuthState("u-1")}x`],
        ["wrong secret", () => signOAuthState("u-1", { secret: "other-secret-32-chars-long!!!!!" })],
        ["expired", () => signOAuthState("u-1", { now: Date.now() - 3_600_000 })],
      ])("rejects a %s state without exchanging", async (_name, state) => {
        const exchangeCode = vi.fn();
        const res = fakeRes();
        await expect(
          cfg.build({ exchangeCode }).callback("code", state(), res),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(exchangeCode).not.toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it("binds the exchange to the user in the signed state", async () => {
        const exchangeCode = vi.fn().mockResolvedValue({ ok: true });
        await cfg
          .build({ exchangeCode })
          .callback("code", signOAuthState("victim-free-user"), fakeRes());
        expect(exchangeCode).toHaveBeenCalledWith("code", "victim-free-user");
      });

      it("does not redirect when the exchange fails", async () => {
        const exchangeCode = vi
          .fn()
          .mockRejectedValue(new BadRequestException("exchange failed"));
        const res = fakeRes();
        await expect(
          cfg
            .build({ exchangeCode })
            .callback("code", signOAuthState("u-1"), res),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(res.redirect).not.toHaveBeenCalled();
      });

      cfg.describeRedirects(async (ctrl) => {
        const res = fakeRes();
        await ctrl.callback("code", signOAuthState("u-1"), res);
        return String(res.redirect.mock.calls[0]![0]);
      });
    });
  });
}
