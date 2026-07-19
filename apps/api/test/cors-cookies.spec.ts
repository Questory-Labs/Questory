import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "@questorylabs/shared/session";

describe("cookie security flags", () => {
  it("marks session cookies httpOnly and SameSite=lax", () => {
    const opts = sessionCookieOptions("production");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });
});
