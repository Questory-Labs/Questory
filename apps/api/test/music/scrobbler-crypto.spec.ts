import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
} from "../../src/music/scrobbler/scrobbler-crypto";

describe("scrobbler-crypto", () => {
  const prev = process.env.SESSION_SECRET;

  afterEach(() => {
    process.env.SESSION_SECRET = prev;
  });

  it("round-trips a session key", () => {
    process.env.SESSION_SECRET = "test-session-secret-32chars!!";
    const stored = encryptSecret("lastfm-session-key");
    expect(stored.startsWith("enc:v1:")).toBe(true);
    expect(decryptSecret(stored)).toBe("lastfm-session-key");
  });

  it("leaves plaintext secrets unchanged on decrypt", () => {
    expect(decryptSecret("plain-session")).toBe("plain-session");
  });
});
