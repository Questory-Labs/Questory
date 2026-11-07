import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { Response } from "express";
import { ReadMalController } from "../../src/read/mal/mal.controller";
import { ReadSessionUserGuard } from "../../src/read/auth/session-user.guard";
import type { MalService } from "../../src/watch/mal/mal.service";

function resMock() {
  const res = {
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
  return res as typeof res & Response;
}

function build() {
  const mal = {
    getConnection: vi.fn().mockResolvedValue({ connected: false }),
    buildAuthState: vi.fn().mockReturnValue({ state: "s", url: "https://mal.test/auth" }),
    exchangeCode: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: vi.fn().mockResolvedValue({ ok: true, disconnected: true }),
  };
  return { mal, controller: new ReadMalController(mal as unknown as MalService) };
}

beforeEach(() => {
  vi.stubEnv("WEB_ORIGIN", "");
  vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("ReadMalController", () => {
  it.each(["status", "authorize", "disconnect"] as const)(
    "protects %s with the read session guard",
    (method) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ReadMalController.prototype[method]),
      ).toEqual([ReadSessionUserGuard]);
    },
  );

  it("status and disconnect are scoped to the session user", async () => {
    const { controller, mal } = build();
    await controller.status("u-1");
    await controller.disconnect("u-1");
    expect(mal.getConnection).toHaveBeenCalledWith("u-1");
    expect(mal.disconnect).toHaveBeenCalledWith("u-1");
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
    expect(mal.exchangeCode).not.toHaveBeenCalled();
  });

  it("callback does not redirect when the state is rejected", async () => {
    const { controller, mal } = build();
    mal.exchangeCode.mockRejectedValue(new BadRequestException("Invalid"));
    const res = resMock();
    await expect(controller.callback("code", "bad", res)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each([
    [{ WEB_ORIGIN: "https://app.example/" }, "https://app.example"],
    [{ NEXT_PUBLIC_WEB_URL: "https://web.example" }, "https://web.example"],
    [{}, "http://localhost:3000"],
  ])("callback redirects to the read tab using %j", async (env, origin) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const { controller, mal } = build();
    const res = resMock();
    await controller.callback("code", "state", res);
    expect(mal.exchangeCode).toHaveBeenCalledWith("code", "state");
    expect(res.redirect).toHaveBeenCalledWith(
      `${origin}/sources?tab=read&mal=connected`,
    );
  });
});
