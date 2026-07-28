import { describe, expect, it } from "vitest";
import {
  resolveCookieSecure,
  sessionCookieOptions,
} from "@questorylabs/shared/session";

describe("cookie security flags", () => {
  it("marks session cookies httpOnly and SameSite=lax", () => {
    const opts = sessionCookieOptions({
      nodeEnv: "production",
      publicOrigin: "https://app.example.com",
    });
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });

  it("omits Secure for http LAN origins even in production", () => {
    expect(
      resolveCookieSecure({
        nodeEnv: "production",
        publicOrigin: "http://192.168.1.111:3010",
      }),
    ).toBe(false);
  });
});
