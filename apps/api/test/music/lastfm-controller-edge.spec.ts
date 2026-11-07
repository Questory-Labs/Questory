import { GUARDS_METADATA } from "@nestjs/common/constants";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionUserGuard } from "../../src/music/auth/session-user.guard";
import { LastFmController } from "../../src/music/scrobbler/lastfm/lastfm.controller";

const auth = {
  status: vi.fn(),
  authorizeUrl: vi.fn(),
  complete: vi.fn(),
  resolveUserIdFromToken: vi.fn(),
  disconnect: vi.fn(),
};

function makeRes() {
  return { redirect: vi.fn().mockReturnValue("redirected") };
}

function location(res: ReturnType<typeof makeRes>) {
  return res.redirect.mock.calls[0][0] as string;
}

describe("LastFmController edge cases", () => {
  let controller: LastFmController;

  beforeEach(() => {
    for (const fn of Object.values(auth)) fn.mockReset();
    vi.stubEnv("WEB_ORIGIN", "https://app.example.com");
    controller = new LastFmController(auth as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("guards", () => {
    it.each(["status", "authorize", "disconnect"] as const)(
      "%s requires a session",
      (method) => {
        const guards = Reflect.getMetadata(
          GUARDS_METADATA,
          LastFmController.prototype[method],
        );
        expect(guards).toContain(SessionUserGuard);
      },
    );

    it("callback is reachable without a session", () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, LastFmController.prototype.callback),
      ).toBeUndefined();
    });
  });

  describe("session routes", () => {
    it("status uses the session user", () => {
      auth.status.mockReturnValue("status");
      expect(controller.status({ userId: "u1" })).toBe("status");
      expect(auth.status).toHaveBeenCalledWith("u1");
    });

    it("disconnect uses the session user", () => {
      auth.disconnect.mockReturnValue("gone");
      expect(controller.disconnect({ userId: "u1" })).toBe("gone");
      expect(auth.disconnect).toHaveBeenCalledWith("u1");
    });

    it("authorize redirects to the URL for the session user", async () => {
      auth.authorizeUrl.mockResolvedValue("https://www.last.fm/api/auth?x=1");
      const res = makeRes();
      await controller.authorize(res as never, { userId: "u1" });
      expect(auth.authorizeUrl).toHaveBeenCalledWith("u1");
      expect(res.redirect).toHaveBeenCalledWith("https://www.last.fm/api/auth?x=1");
    });
  });

  describe("callback", () => {
    it("rejects a missing token without touching the cache", async () => {
      const res = makeRes();
      await controller.callback(undefined, res as never);
      expect(location(res)).toBe(
        "https://app.example.com/sources?tab=music&lastfm=error&reason=missing_token",
      );
      expect(auth.resolveUserIdFromToken).not.toHaveBeenCalled();
    });

    it("rejects a token that was not issued to a user", async () => {
      auth.resolveUserIdFromToken.mockResolvedValue(null);
      const res = makeRes();
      await controller.callback("forged", res as never);
      expect(location(res)).toContain("reason=invalid_state");
      expect(auth.complete).not.toHaveBeenCalled();
    });

    it("completes for the user bound to the token", async () => {
      auth.resolveUserIdFromToken.mockResolvedValue("bound-user");
      auth.complete.mockResolvedValue({ ok: true });
      const res = makeRes();
      await controller.callback("tok", res as never);
      expect(auth.resolveUserIdFromToken).toHaveBeenCalledWith("tok");
      expect(auth.complete).toHaveBeenCalledWith("tok", "bound-user");
      expect(location(res)).toBe(
        "https://app.example.com/sources?tab=music&lastfm=connected",
      );
      expect(res.redirect).toHaveBeenCalledTimes(1);
    });

    it("hides internal error details from the redirect", async () => {
      auth.resolveUserIdFromToken.mockResolvedValue("u1");
      auth.complete.mockRejectedValue(
        new Error("LASTFM_API_SECRET missing\r\nSet-Cookie: x=1"),
      );
      const res = makeRes();
      await controller.callback("tok", res as never);
      expect(location(res)).toBe(
        "https://app.example.com/sources?tab=music&lastfm=error&reason=callback_failed",
      );
    });

    it("redirects with the generic reason when the state lookup fails", async () => {
      auth.resolveUserIdFromToken.mockRejectedValue(new Error("redis down"));
      const res = makeRes();
      await controller.callback("tok", res as never);
      expect(location(res)).toBe(
        "https://app.example.com/sources?tab=music&lastfm=error&reason=callback_failed",
      );
      expect(auth.complete).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledTimes(1);
    });

    it("uses a generic reason for non-Error rejections", async () => {
      auth.resolveUserIdFromToken.mockResolvedValue("u1");
      auth.complete.mockRejectedValue("boom");
      const res = makeRes();
      await controller.callback("tok", res as never);
      expect(location(res)).toContain("reason=callback_failed");
    });
  });

  describe("web origin", () => {
    it("strips a trailing slash", async () => {
      vi.stubEnv("WEB_ORIGIN", "https://app.example.com/");
      const res = makeRes();
      await controller.callback(undefined, res as never);
      expect(location(res).startsWith("https://app.example.com/sources")).toBe(true);
    });

    it("falls back to NEXT_PUBLIC_WEB_URL", async () => {
      vi.stubEnv("WEB_ORIGIN", "");
      vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://public.example.com");
      const res = makeRes();
      await controller.callback(undefined, res as never);
      expect(location(res).startsWith("https://public.example.com/sources")).toBe(true);
    });

    it("falls back to localhost", async () => {
      vi.stubEnv("WEB_ORIGIN", "");
      vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
      const res = makeRes();
      await controller.callback(undefined, res as never);
      expect(location(res).startsWith("http://localhost:3000/sources")).toBe(true);
    });
  });
});
