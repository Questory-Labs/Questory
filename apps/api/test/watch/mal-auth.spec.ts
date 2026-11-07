import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  generateMalPkce,
  signMalOAuthState,
  verifyMalOAuthState,
} from "../../src/watch/mal/mal-auth";

const SECRET = "mal-state-test-secret-32-chars!!!";

function forge(payload: unknown, secret = SECRET) {
  const body = Buffer.from(
    typeof payload === "string" ? payload : JSON.stringify(payload),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

describe("generateMalPkce", () => {
  it("produces an RFC 7636 verifier with a plain challenge", () => {
    const { codeVerifier, codeChallenge } = generateMalPkce();
    expect(codeVerifier).toMatch(/^[a-zA-Z0-9\-._~]{43,128}$/);
    expect(codeChallenge).toBe(codeVerifier);
  });

  it("generates a fresh verifier every call", () => {
    const seen = new Set(
      Array.from({ length: 20 }, () => generateMalPkce().codeVerifier),
    );
    expect(seen.size).toBe(20);
  });
});

describe("signMalOAuthState / verifyMalOAuthState", () => {
  it("round-trips the user and verifier", () => {
    const state = signMalOAuthState("u-1", "verifier-1", { secret: SECRET });
    expect(verifyMalOAuthState(state, { secret: SECRET })).toMatchObject({
      userId: "u-1",
      codeVerifier: "verifier-1",
    });
  });

  it("uses a unique nonce so identical inputs yield distinct states", () => {
    const a = signMalOAuthState("u-1", "v", { secret: SECRET, now: 1000 });
    const b = signMalOAuthState("u-1", "v", { secret: SECRET, now: 1000 });
    expect(a).not.toBe(b);
  });

  it("falls back to the session secret when none is passed", () => {
    const state = signMalOAuthState("u-1", "v");
    expect(verifyMalOAuthState(state)?.userId).toBe("u-1");
    expect(verifyMalOAuthState(state, { secret: SECRET })).toBeNull();
  });

  it("defaults to a 15 minute lifetime", () => {
    const now = 1_000_000;
    const state = signMalOAuthState("u-1", "v", { secret: SECRET, now });
    const ttl = 15 * 60 * 1000;
    expect(
      verifyMalOAuthState(state, { secret: SECRET, now: now + ttl }),
    ).not.toBeNull();
    expect(
      verifyMalOAuthState(state, { secret: SECRET, now: now + ttl + 1 }),
    ).toBeNull();
  });

  it("honors a custom ttl", () => {
    const state = signMalOAuthState("u-1", "v", {
      secret: SECRET,
      now: 1000,
      ttlMs: 50,
    });
    expect(
      verifyMalOAuthState(state, { secret: SECRET, now: 1051 }),
    ).toBeNull();
  });

  it("rejects a state signed with another secret", () => {
    const state = signMalOAuthState("u-1", "v", { secret: "other-secret" });
    expect(verifyMalOAuthState(state, { secret: SECRET })).toBeNull();
  });

  it("rejects a payload swapped to another user", () => {
    const state = signMalOAuthState("u-1", "v", { secret: SECRET });
    const [, sig] = state.split(".");
    const body = Buffer.from(
      JSON.stringify({
        userId: "victim",
        codeVerifier: "v",
        nonce: "n",
        exp: Date.now() + 60_000,
      }),
    ).toString("base64url");
    expect(verifyMalOAuthState(`${body}.${sig}`, { secret: SECRET })).toBeNull();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
    ["no separator", "abcdef"],
    ["missing signature", "abcdef."],
    ["missing body", ".abcdef"],
    ["short signature", "abc.def"],
  ])("rejects %s", (_label, state) => {
    expect(verifyMalOAuthState(state, { secret: SECRET })).toBeNull();
  });

  it("rejects a correctly signed body that is not JSON", () => {
    expect(verifyMalOAuthState(forge("not json"), { secret: SECRET })).toBeNull();
  });

  it.each([
    ["userId", { codeVerifier: "v", nonce: "n", exp: Date.now() + 60_000 }],
    ["codeVerifier", { userId: "u", nonce: "n", exp: Date.now() + 60_000 }],
    ["exp", { userId: "u", codeVerifier: "v", nonce: "n" }],
  ])("rejects a signed payload missing %s", (_field, payload) => {
    expect(verifyMalOAuthState(forge(payload), { secret: SECRET })).toBeNull();
  });
});
