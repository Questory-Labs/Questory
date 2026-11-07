import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { Response } from "express";
import {
  signOAuthState,
  verifyOAuthState,
} from "@questorylabs/shared/oauth-state";
import { AnilistController } from "../../src/watch/anilist/anilist.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { AnilistService } from "../../src/watch/anilist/anilist.service";
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
  const anilist = {
    getConnection: vi.fn().mockResolvedValue({ connected: true }),
    authUrl: vi.fn((state: string) => `https://anilist.test/auth?state=${state}`),
    exchangeCode: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
  };
  const flags = { isDomainEnabled: vi.fn().mockResolvedValue(watchOn) };
  return {
    anilist,
    controller: new AnilistController(
      anilist as unknown as AnilistService,
      flags as unknown as FeatureFlagsService,
    ),
  };
}

beforeEach(() => {
  vi.stubEnv("WEB_ORIGIN", "https://app.example/");
});

afterEach(() => vi.unstubAllEnvs());

describe("AnilistController guards", () => {
  it.each(["status", "authorize", "disconnect"] as const)(
    "protects %s with the session guard",
    (method) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, AnilistController.prototype[method]),
      ).toEqual([SessionUserGuard]);
    },
  );

  it("leaves the callback unguarded because the signed state binds the user", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AnilistController.prototype.callback),
    ).toBeUndefined();
  });
});

describe("AnilistController", () => {
  it("status is scoped to the session user", async () => {
    const { controller, anilist } = build();
    await expect(controller.status("u-1")).resolves.toEqual({ connected: true });
    expect(anilist.getConnection).toHaveBeenCalledWith("u-1");
  });

  it("authorize redirects with a state signed for the session user", () => {
    const { controller, anilist } = build();
    const res = resMock();
    controller.authorize(res, "u-1");
    const state = anilist.authUrl.mock.calls[0][0];
    expect(verifyOAuthState(state)?.userId).toBe("u-1");
    expect(res.redirect).toHaveBeenCalledWith(
      `https://anilist.test/auth?state=${state}`,
    );
  });

  it("callback requires a code", async () => {
    const { controller, anilist } = build();
    const res = resMock();
    await controller.callback("", signOAuthState("u-1"), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing code");
    expect(anilist.exchangeCode).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["garbage", "not-a-state"],
    ["expired", signOAuthState("u-1", { ttlMs: -1000 })],
    ["wrong secret", signOAuthState("u-1", { secret: "another-secret" })],
  ])("callback rejects a %s state without exchanging", async (_label, state) => {
    const { controller, anilist } = build();
    const res = resMock();
    await expect(controller.callback("code", state, res)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(anilist.exchangeCode).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("callback exchanges for the user in the signed state", async () => {
    const { controller, anilist } = build();
    await controller.callback("code", signOAuthState("u-7"), resMock());
    expect(anilist.exchangeCode).toHaveBeenCalledWith("code", "u-7");
  });

  it("callback redirects to the watch tab when Watch is on", async () => {
    const { controller } = build(true);
    const res = resMock();
    await controller.callback("code", signOAuthState("u-1"), res);
    expect(res.redirect).toHaveBeenCalledWith(
      "https://app.example/sources?tab=watch&anilist=connected",
    );
  });

  it("callback redirects to the read tab when Watch is off", async () => {
    const { controller } = build(false);
    const res = resMock();
    await controller.callback("code", signOAuthState("u-1"), res);
    expect(res.redirect).toHaveBeenCalledWith(
      "https://app.example/sources?tab=read&anilist=connected",
    );
  });

  it("callback does not redirect when the exchange fails", async () => {
    const { controller, anilist } = build();
    anilist.exchangeCode.mockRejectedValue(new BadRequestException("nope"));
    const res = resMock();
    await expect(
      controller.callback("code", signOAuthState("u-1"), res),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("disconnect is scoped to the session user", async () => {
    const { controller, anilist } = build();
    await controller.disconnect("u-1");
    expect(anilist.disconnect).toHaveBeenCalledWith("u-1");
  });
});
