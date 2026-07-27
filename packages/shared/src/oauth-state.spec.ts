import { describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "./oauth-state";

const SECRET = "test-session-secret-32chars!!";

describe("oauth state", () => {
  it("signs and verifies userId binding", () => {
    const state = signOAuthState("user-a", { secret: SECRET });
    const parsed = verifyOAuthState(state, { secret: SECRET });
    expect(parsed?.userId).toBe("user-a");
  });

  it("rejects retarget/tamper", () => {
    const state = signOAuthState("user-a", { secret: SECRET });
    const [body] = state.split(".");
    const evil = Buffer.from(
      JSON.stringify({
        userId: "user-b",
        nonce: "x",
        exp: Date.now() + 60_000,
      }),
    ).toString("base64url");
    const [, sig] = state.split(".");
    expect(verifyOAuthState(`${evil}.${sig}`, { secret: SECRET })).toBeNull();
    expect(verifyOAuthState(`${body}.deadbeef`, { secret: SECRET })).toBeNull();
  });

  it("rejects expired state", () => {
    const state = signOAuthState("user-a", {
      secret: SECRET,
      ttlMs: 1,
      now: Date.now() - 10_000,
    });
    expect(verifyOAuthState(state, { secret: SECRET })).toBeNull();
  });
});
