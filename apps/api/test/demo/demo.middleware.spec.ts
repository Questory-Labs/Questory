import { Readable } from "node:stream";
import { HttpException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_READ_ONLY_CODE,
  DEMO_READ_POST_PATHS,
  DEMO_USER_ID,
  normalizeDemoPath,
} from "@questorylabs/shared";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { createDemoMiddleware } from "../../src/demo/demo.middleware";
import { DEMO_ROUTES } from "../../src/demo/demo.routes";

const HOUR = 60 * 60 * 1000;

function demoCookie(exp = Date.now() + HOUR) {
  return encodeSessionCookie({
    userId: DEMO_USER_ID,
    steamId: null,
    exp,
    demo: true,
  });
}

function makeReq(method: string, path: string, cookie?: string, body?: string) {
  const req = Readable.from(body ? [Buffer.from(body)] : []) as unknown as Record<
    string,
    unknown
  >;
  req.method = method;
  req.path = path;
  req.query = {};
  req.headers = {};
  req.cookies = cookie ? { [SESSION_COOKIE_NAME]: cookie } : {};
  return req as never;
}

function makeRes() {
  const res = {
    statusCode: 0,
    payload: undefined as unknown,
    headersSent: false,
    headers: {} as Record<string, string>,
    cleared: false,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(value: unknown) {
      res.payload = value;
      res.headersSent = true;
      return res;
    },
    end() {
      res.headersSent = true;
      return res;
    },
    clearCookie() {
      res.cleared = true;
      return res;
    },
    cookie: vi.fn(),
  };
  return res;
}

describe("demo middleware", () => {
  const flags = { isDemoEnabled: vi.fn() };
  const limits = { assertDemoRequestLimits: vi.fn() };
  const next = vi.fn();
  const middleware = createDemoMiddleware(flags, limits);

  async function run(method: string, path: string, cookie = demoCookie(), body?: string) {
    const res = makeRes();
    await middleware(makeReq(method, path, cookie, body), res as never, next);
    return res;
  }

  beforeEach(() => {
    next.mockReset();
    flags.isDemoEnabled.mockReset().mockResolvedValue(true);
    limits.assertDemoRequestLimits.mockReset().mockResolvedValue(undefined);
  });

  it("answers 429 over the request limit and keeps the session", async () => {
    limits.assertDemoRequestLimits.mockRejectedValue(
      new HttpException({ statusCode: 429, message: "Too many" }, 429),
    );
    const res = await run("GET", "/v1/music/analytics/insights");
    expect(res.statusCode).toBe(429);
    expect(res.cleared).toBe(false);
    const logout = await run("POST", "/auth/logout");
    expect(logout.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter errors", async () => {
    limits.assertDemoRequestLimits.mockRejectedValue(new Error("cache down"));
    const res = await run("GET", "/v1/library");
    expect(res.statusCode).toBe(401);
    expect(res.cleared).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "denies %s writes without reaching controllers",
    async (method) => {
      for (const path of [
        "/v1/users/me",
        "/v1/sync/user",
        "/v1/admin/settings",
        "/v1/notifications/read",
        "/v1/recommendations/feedback",
        "/v1/enterprise/dossier/refresh",
        "/v1/family/members",
        "/auth/login",
      ]) {
        const res = await run(method, path);
        expect(res.statusCode, path).toBe(403);
        expect(res.payload).toMatchObject({ code: DEMO_READ_ONLY_CODE });
      }
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each([
    "/auth/steam",
    "/auth/steam/callback",
    "/v1/watch/trakt/authorize",
    "/v1/music/scrobbler/lastfm/authorize",
    "/v1/admin/users",
    "/v1/admin/settings",
    "/v1/users/me/export/file",
    "/v1/no-such-route",
  ])("does not serve GET %s", async (path) => {
    const res = await run("GET", path);
    expect(res.statusCode).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("reports an idle export and refuses to start one", async () => {
    const status = await run("GET", "/v1/users/me/export");
    expect(status.statusCode).toBe(200);
    expect(status.payload).toMatchObject({ status: "none", downloadReady: false });
    const start = await run("POST", "/v1/users/me/export");
    expect(start.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not bypass matching with case, encoding, or trailing slashes", async () => {
    for (const path of ["/V1/ADMIN/USERS", "/v1/admin/users/", "/v1/%61dmin/users"]) {
      const res = await run("GET", path);
      expect(res.statusCode, path).toBe(404);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it("answers malformed percent-encoding without ending the session", async () => {
    const res = await run("GET", "/v1/games/%E0%A4%A");
    expect(res.statusCode).toBe(404);
    expect(res.cleared).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it("answers stream paths with 204", async () => {
    const res = await run("GET", "/v1/shell/sync-status/stream");
    expect(res.statusCode).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes only health checks through", async () => {
    await run("GET", "/health");
    expect(next).toHaveBeenCalledTimes(1);
    next.mockClear();
    const res = await run("POST", "/health");
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("logs out by clearing the cookie", async () => {
    const res = await run("POST", "/auth/logout");
    expect(res.statusCode).toBe(201);
    expect(res.cleared).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not renew the session on repeat demo login", async () => {
    const res = await run("POST", "/auth/demo");
    expect(res.statusCode).toBe(200);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("fails closed when the flag is off", async () => {
    flags.isDemoEnabled.mockResolvedValue(false);
    const res = await run("GET", "/v1/library");
    expect(res.statusCode).toBe(401);
    expect(res.cleared).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when the flag read throws", async () => {
    flags.isDemoEnabled.mockRejectedValue(new Error("db down"));
    const res = await run("GET", "/v1/library");
    expect(res.statusCode).toBe(401);
    expect(res.cleared).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("handles malformed and oversized POST bodies", async () => {
    for (const body of ["{not json", "x".repeat(32 * 1024)]) {
      const res = await run("POST", "/v1/recommendations/curate", demoCookie(), body);
      expect(res.statusCode).toBe(201);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it("leaves real and anonymous sessions alone", async () => {
    const real = encodeSessionCookie({ userId: "u1", steamId: null });
    for (const cookie of [real, undefined]) {
      next.mockClear();
      const res = makeRes();
      await middleware(makeReq("POST", "/v1/users/me", cookie), res as never, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(0);
    }
    expect(flags.isDemoEnabled).not.toHaveBeenCalled();
  });

  it("ignores expired and tampered demo cookies", async () => {
    const expired = demoCookie(Date.now() - 1000);
    const valid = demoCookie();
    const tampered = `${valid.slice(0, -2)}xx`;
    for (const cookie of [expired, tampered]) {
      next.mockClear();
      const res = makeRes();
      await middleware(makeReq("GET", "/v1/library", cookie), res as never, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(0);
    }
  });
});

describe("demo route table", () => {
  const FORBIDDEN =
    /^\/admin|^\/auth\/(steam|login|register)|authorize|callback|\/connect$|\/export\/|^\/webhooks|^\/oauth|^\/1\//;

  it("registers nothing that can escape or expose real data", () => {
    const bad = DEMO_ROUTES.filter((route) => FORBIDDEN.test(route.pattern));
    expect(bad.map((route) => route.pattern)).toEqual([]);
  });

  it("only serves POST from the read allowlist", () => {
    const allowed = new Set<string>(DEMO_READ_POST_PATHS);
    const bad = DEMO_ROUTES.filter(
      (route) => route.method === "POST" && !allowed.has(route.pattern),
    );
    expect(bad.map((route) => route.pattern)).toEqual([]);
  });

  it("uses normalized patterns without duplicates", () => {
    const seen = new Set<string>();
    for (const route of DEMO_ROUTES) {
      expect(normalizeDemoPath(route.pattern)).toBe(route.pattern);
      const key = `${route.method} ${route.pattern}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });
});
