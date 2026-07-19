import { describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";

describe("OAuth state IDOR resistance", () => {
  const secret = "test-session-secret-32chars!!";

  it("callback cannot retarget to another user via unsigned state", () => {
    const state = signOAuthState("user-a", { secret });
    expect(verifyOAuthState("user-b", { secret })).toBeNull();
    expect(verifyOAuthState(state, { secret })?.userId).toBe("user-a");
  });
});
