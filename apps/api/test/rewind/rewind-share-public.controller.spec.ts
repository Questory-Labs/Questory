import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpException, NotFoundException } from "@nestjs/common";
import { AuthAbuseService } from "../../src/auth/abuse/auth-abuse.service";
import { CacheService } from "../../src/cache/cache.service";
import { RewindSharePublicController } from "../../src/rewind/rewind-share-public.controller";
import type { RewindShareService } from "../../src/rewind/rewind-share.service";

function makeReq(ip: string) {
  return { headers: {}, ip, socket: { remoteAddress: ip } } as never;
}

function makeRes() {
  const headers: Record<string, string> = {};
  return {
    res: { setHeader: (k: string, v: string) => void (headers[k] = v) } as never,
    headers,
  };
}

function makeController() {
  const resolveShare = vi.fn();
  const resolveBadge = vi.fn();
  const shares = { resolveShare, resolveBadge } as unknown as RewindShareService;
  const controller = new RewindSharePublicController(
    shares,
    new AuthAbuseService(new CacheService()),
  );
  return { controller, resolveShare, resolveBadge };
}

describe("RewindSharePublicController", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 404 for an unknown token", async () => {
    const { controller, resolveShare } = makeController();
    resolveShare.mockRejectedValue(new NotFoundException("Share not found"));
    const err = await controller.rewind(makeReq("10.0.0.1"), "bad").catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundException);
  });

  it("serves the badge as cached svg and strips the extension", async () => {
    const { controller, resolveBadge } = makeController();
    resolveBadge.mockResolvedValue("<svg/>");
    const { res, headers } = makeRes();
    const out = await controller.badge(makeReq("10.0.0.2"), res, "abc.svg");
    expect(out).toBe("<svg/>");
    expect(resolveBadge).toHaveBeenCalledWith("abc");
    expect(headers["Content-Type"]).toContain("image/svg+xml");
    expect(headers["Cache-Control"]).toBe("public, max-age=300");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
  });

  it("limits failed lookups per ip but never valid tokens", async () => {
    const { controller, resolveShare, resolveBadge } = makeController();
    resolveShare.mockResolvedValue({ domain: "games" });
    for (let i = 0; i < 200; i += 1) {
      await controller.rewind(makeReq("10.0.0.3"), "tok");
    }
    resolveShare.mockRejectedValue(new NotFoundException("Share not found"));
    resolveBadge.mockRejectedValue(new NotFoundException("Share not found"));
    for (let i = 0; i < 30; i += 1) {
      const fn = i % 2 ? () => controller.badge(makeReq("10.0.0.3"), makeRes().res, "bad") : () => controller.rewind(makeReq("10.0.0.3"), "bad");
      await expect(fn()).rejects.toBeInstanceOf(NotFoundException);
    }
    resolveShare.mockResolvedValue({ domain: "games" });
    const err = await controller.rewind(makeReq("10.0.0.3"), "tok").catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    await expect(controller.rewind(makeReq("10.0.0.4"), "tok")).resolves.toEqual({ domain: "games" });
  });

  it("counts a view only when the page render asks for it", async () => {
    const { controller, resolveShare } = makeController();
    resolveShare.mockResolvedValue({ domain: "games" });
    await controller.rewind(makeReq("10.0.0.5"), "tok");
    await controller.rewind(makeReq("10.0.0.5"), "tok", "1");
    expect(resolveShare.mock.calls[0]![1]).toEqual({ countView: false });
    expect(resolveShare.mock.calls[1]![1]).toEqual({ countView: true });
  });
});
