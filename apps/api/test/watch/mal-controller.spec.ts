import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { Response } from "express";
import { MalController } from "../../src/watch/mal/mal.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { MalService } from "../../src/watch/mal/mal.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

function resMock() {
  const res = {
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
  return res as typeof res & Response;
}

function build(watchOn = true) {
  const mal = {
    getConnection: vi.fn().mockResolvedValue({ connected: true }),
    buildAuthState: vi.fn().mockReturnValue({ state: "s", url: "https://mal.test/auth" }),
    exchangeCode: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
  };
  const flags = { isDomainEnabled: vi.fn().mockResolvedValue(watchOn) };
  return {
    mal,
    controller: new MalController(
      mal as unknown as MalService,
      flags as unknown as FeatureFlagsService,
    ),
  };
}

beforeEach(() => vi.stubEnv("WEB_ORIGIN", "https://app.example"));

afterEach(() => vi.unstubAllEnvs());

describe("MalController", () => {
  it.each(["status", "authorize", "disconnect"] as const)(
    "protects %s with the session guard",
    (method) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, MalController.prototype[method]),
      ).toEqual([SessionUserGuard]);
    },
  );

  it("leaves the callback unguarded because the signed state binds the user", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MalController.prototype.callback),
    ).toBeUndefined();
  });

  it("status is scoped to the session user", async () => {
    const { controller, mal } = build();
    await controller.status("u-1");
    expect(mal.getConnection).toHaveBeenCalledWith("u-1");
  });

  it("authorize redirects to the URL built for the session user", () => {
    const { controller, mal } = build();
    const res = resMock();
    controller.authorize(res, "u-1");
    expect(mal.buildAuthState).toHaveBeenCalledWith("u-1");
    expect(res.redirect).toHaveBeenCalledWith("https://mal.test/auth");
  });

  it("callback requires a code", async () => {
    const { controller, mal } = build();
    const res = resMock();
    await controller.callback("", "state", res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing code");
    expect(mal.exchangeCode).not.toHaveBeenCalled();
  });

  it("callback hands the state to the service for verification", async () => {
    const { controller, mal } = build();
    await controller.callback("code", "state", resMock());
    expect(mal.exchangeCode).toHaveBeenCalledWith("code", "state");
  });

  it.each([
    [true, "watch"],
    [false, "read"],
  ])("callback with Watch on=%s redirects to the %s tab", async (watchOn, tab) => {
    const { controller } = build(watchOn);
    const res = resMock();
    await controller.callback("code", "state", res);
    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example/sources?tab=${tab}&mal=connected`,
    );
  });

  it("callback does not redirect when the exchange fails", async () => {
    const { controller, mal } = build();
    mal.exchangeCode.mockRejectedValue(new BadRequestException("Invalid"));
    const res = resMock();
    await expect(controller.callback("code", "bad", res)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("disconnect is scoped to the session user", async () => {
    const { controller, mal } = build();
    await controller.disconnect("u-1");
    expect(mal.disconnect).toHaveBeenCalledWith("u-1");
  });
});
