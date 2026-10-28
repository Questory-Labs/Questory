import { beforeEach, describe, expect, it } from "vitest";
import { AuthAbuseService } from "../../src/auth/abuse/auth-abuse.service";
import { CacheService } from "../../src/cache/cache.service";

describe("login lockout feedback", () => {
  let abuse: AuthAbuseService;

  beforeEach(() => {
    abuse = new AuthAbuseService(new CacheService());
  });

  it("counts down attempts then locks with retryAfterSec", async () => {
    const states = [];
    for (let i = 0; i < 5; i++) {
      states.push(await abuse.recordLoginFailure("10.0.0.1", "a@example.com"));
    }
    expect(states.slice(0, 4).map((s) => s.attemptsLeft)).toEqual([4, 3, 2, 1]);
    expect(states[4]).toEqual({ attemptsLeft: 0, retryAfterSec: 60 });

    const err = await abuse
      .assertLoginLimits("10.0.0.1", "a@example.com")
      .catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse().retryAfterSec).toBeGreaterThan(0);
    expect(err.getResponse().retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("clears email lock after success", async () => {
    for (let i = 0; i < 5; i++) {
      await abuse.recordLoginFailure("10.0.0.2", "b@example.com");
    }
    await abuse.clearLoginFailures("b@example.com");
    const state = await abuse.recordLoginFailure("10.0.0.3", "b@example.com");
    expect(state).toEqual({ attemptsLeft: 4 });
  });
});
