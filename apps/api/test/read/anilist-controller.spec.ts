import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { Response } from "express";
import {
  signOAuthState,
  verifyOAuthState,
} from "@questorylabs/shared/oauth-state";
import { ReadAnilistController } from "../../src/read/anilist/anilist.controller";
import { ReadSessionUserGuard } from "../../src/read/auth/session-user.guard";
import type { AnilistService } from "../../src/watch/anilist/anilist.service";

function resMock() {
  const res = {
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
  return res as typeof res & Response;
}

function build() {
  const anilist = {
    getConnection: vi.fn().mockResolvedValue({ connected: false }),
    authUrl: vi.fn((state: string) => `https://anilist.test/auth?state=${state}`),
    exchangeCode: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
  };
  return {
    anilist,
    controller: new ReadAnilistController(anilist as unknown as AnilistService),
  };
}

beforeEach(() => {
  vi.stubEnv("WEB_ORIGIN", "");
  vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("ReadAnilistController", () => {
  it.each(["status", "authorize", "disconnect"] as const)(
    "protects %s with the read session guard",
    (method) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ReadAnilistController.prototype[method]),
      ).toEqual([ReadSessionUserGuard]);
    },
  );

  it("status and disconnect are scoped to the session user", async () => {
    const { controller, anilist } = build();
    await controller.status("u-1");
    await controller.disconnect("u-1");
    expect(anilist.getConnection).toHaveBeenCalledWith("u-1");
    expect(anilist.disconnect).toHaveBeenCalledWith("u-1");
  });

  it("authorize signs the state for the session user", () => {
    const { controller, anilist } = build();
    const res = resMock();
    controller.authorize(res, "u-1");
    const state = anilist.authUrl.mock.calls[0][0];
    expect(verifyOAuthState(state)?.userId).toBe("u-1");
    expect(res.redirect).toHaveBeenCalledOnce();
  });

  it("callback requires a code", async () => {
    const { controller, anilist } = build();
    const res = resMock();
    await controller.callback("", signOAuthState("u-1"), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(anilist.exchangeCode).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["garbage", "abc.def"],
    ["expired", signOAuthState("u-1", { ttlMs: -1000 })],
  ])("callback rejects a %s state", async (_label, state) => {
    const { controller, anilist } = build();
    await expect(
      controller.callback("code", state, resMock()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(anilist.exchangeCode).not.toHaveBeenCalled();
  });

  it("callback exchanges for the state user", async () => {
    const { controller, anilist } = build();
    await controller.callback("code", signOAuthState("u-9"), resMock());
    expect(anilist.exchangeCode).toHaveBeenCalledWith("code", "u-9");
  });

  it.each([
    [{ WEB_ORIGIN: "https://app.example/" }, "https://app.example"],
    [{ NEXT_PUBLIC_WEB_URL: "https://web.example" }, "https://web.example"],
    [{}, "http://localhost:3000"],
  ])("callback redirects to the read tab using %j", async (env, origin) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const { controller } = build();
    const res = resMock();
    await controller.callback("code", signOAuthState("u-1"), res);
    expect(res.redirect).toHaveBeenCalledWith(
      `${origin}/sources?tab=read&anilist=connected`,
    );
  });
});
