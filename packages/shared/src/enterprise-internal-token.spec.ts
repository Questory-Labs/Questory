import { describe, expect, it } from "vitest";
import {
  encodeEnterpriseInternalToken,
  parseEnterpriseInternalToken,
  signEnterpriseInternalBody,
} from "./enterprise-internal-token";

const SECRET = "enterprise-internal-secret-32chars!";

describe("enterprise internal token", () => {
  it("round-trips a valid token", () => {
    const raw = encodeEnterpriseInternalToken(
      { userId: "user-1", isAdmin: true },
      SECRET,
    );
    const parsed = parseEnterpriseInternalToken(raw, SECRET);
    expect(parsed?.userId).toBe("user-1");
    expect(parsed?.isAdmin).toBe(true);
  });

  it("rejects browser session cookies", () => {
    const body = Buffer.from(
      JSON.stringify({ userId: "u1", steamId: null, exp: Date.now() + 60_000 }),
    ).toString("base64url");
    const sig = signEnterpriseInternalBody(body, SECRET);
    expect(parseEnterpriseInternalToken(`${body}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects tampered signature", () => {
    const raw = encodeEnterpriseInternalToken({ userId: "user-1" }, SECRET);
    expect(parseEnterpriseInternalToken(`${raw}x`, SECRET)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const raw = encodeEnterpriseInternalToken(
      { userId: "user-1", exp: 1 },
      SECRET,
    );
    expect(parseEnterpriseInternalToken(raw, SECRET, 2)).toBeNull();
  });
});
