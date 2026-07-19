import { describe, expect, it, beforeEach } from "vitest";
import { AuthAbuseService } from "../../src/auth/abuse/auth-abuse.service";
import { CacheService } from "../../src/cache/cache.service";
import { isDisposableEmailDomain } from "../../src/auth/abuse/disposable-emails";

describe("AuthAbuseService", () => {
  let abuse: AuthAbuseService;

  beforeEach(() => {
    process.env.WEB_ORIGIN = "http://localhost:3000";
    process.env.AUTH_MIN_FILL_MS = "0";
    abuse = new AuthAbuseService(new CacheService());
  });

  it("rejects filled honeypots", () => {
    expect(abuse.honeypotTripped({ website: "http://spam" })).toBe(true);
    expect(
      abuse.honeypotTripped({ website: "", company: "", username: "" }),
    ).toBe(false);
  });

  it("issues and consumes a challenge once", async () => {
    const issued = await abuse.issueChallenge("login", "127.0.0.1");
    await expect(
      abuse.consumeChallenge({
        kind: "login",
        challengeId: issued.challengeId,
        challengeToken: issued.token,
        ip: "127.0.0.1",
      }),
    ).resolves.toBeUndefined();

    await expect(
      abuse.consumeChallenge({
        kind: "login",
        challengeId: issued.challengeId,
        challengeToken: issued.token,
        ip: "127.0.0.1",
      }),
    ).rejects.toThrow();
  });

  it("rejects bad origin", () => {
    expect(() => abuse.assertOriginAllowed("https://evil.example")).toThrow();
    expect(() =>
      abuse.assertOriginAllowed("http://localhost:3000"),
    ).not.toThrow();
  });
});

describe("disposable emails", () => {
  it("blocks known throwaways", () => {
    expect(isDisposableEmailDomain("a@mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("a@gmail.com")).toBe(false);
  });
});
