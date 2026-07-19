import { describe, expect, it } from "vitest";
import {
  encodeSessionCookie,
  parseSessionCookie,
  sessionCookieOptions,
  signSessionBody,
} from "./session";

const SECRET = "test-session-secret-32chars!!";

describe("session cookies", () => {
  it("round-trips a valid cookie", () => {
    const raw = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      SECRET,
    );
    const parsed = parseSessionCookie(raw, SECRET);
    expect(parsed?.userId).toBe("u1");
    expect(parsed?.steamId).toBe("76561198000000000");
  });

  it("rejects tampered body", () => {
    const raw = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      SECRET,
    );
    const [body, sig] = raw.split(".");
    const tampered = `${body.slice(0, -2)}xx.${sig}`;
    expect(parseSessionCookie(tampered, SECRET)).toBeNull();
  });

  it("rejects wrong secret", () => {
    const raw = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      SECRET,
    );
    expect(parseSessionCookie(raw, "other-secret-also-long!!")).toBeNull();
  });

  it("rejects expired payload", () => {
    const raw = encodeSessionCookie(
      {
        userId: "u1",
        steamId: "76561198000000000",
        exp: Date.now() - 1000,
      },
      SECRET,
    );
    expect(parseSessionCookie(raw, SECRET)).toBeNull();
  });

  it("rejects truncated signature", () => {
    const raw = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      SECRET,
    );
    const [body, sig] = raw.split(".");
    expect(parseSessionCookie(`${body}.${sig.slice(0, 4)}`, SECRET)).toBeNull();
  });

  it("rejects length-mismatched signatures via timingSafeEqual guard", () => {
    const body = Buffer.from(
      JSON.stringify({
        userId: "u1",
        steamId: "76561198000000000",
        exp: Date.now() + 60_000,
      }),
    ).toString("base64url");
    const sig = signSessionBody(body, SECRET);
    expect(parseSessionCookie(`${body}.${sig}x`, SECRET)).toBeNull();
  });

  it("sets httpOnly and sameSite lax", () => {
    const opts = sessionCookieOptions("development");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(false);
  });
});
