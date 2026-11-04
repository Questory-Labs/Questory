import { describe, expect, it } from "vitest";
import {
  changePasswordErrorMessage,
  maskToken,
  memberSinceLabel,
  passwordFormError,
} from "./steam.settings-profile.utils";

const httpError = (status: number, body: object) =>
  Object.assign(new Error(JSON.stringify({ statusCode: status, ...body })), { status });

describe("memberSinceLabel", () => {
  it("formats month and year, and ignores missing or invalid dates", () => {
    expect(memberSinceLabel("2024-03-10T00:00:00.000Z")).toMatch(/2024/);
    expect(memberSinceLabel(null)).toBeNull();
    expect(memberSinceLabel("nope")).toBeNull();
  });
});

describe("passwordFormError", () => {
  const ok = { currentPassword: "old", newPassword: "long-enough-1", confirmPassword: "long-enough-1" };

  it("accepts a valid form", () => {
    expect(passwordFormError(ok)).toBeNull();
  });

  it("validates current, length and match", () => {
    expect(passwordFormError({ ...ok, currentPassword: "" })).toBe("Enter your current password.");
    expect(passwordFormError({ ...ok, newPassword: "short", confirmPassword: "short" })).toBe(
      "New password must be at least 10 characters.",
    );
    const long = "x".repeat(129);
    expect(passwordFormError({ ...ok, newPassword: long, confirmPassword: long })).toBe(
      "New password must be 128 characters or fewer.",
    );
    expect(passwordFormError({ ...ok, confirmPassword: "different-1" })).toBe(
      "New passwords don't match.",
    );
  });
});

describe("changePasswordErrorMessage", () => {
  it("maps auth and rate limit errors", () => {
    expect(changePasswordErrorMessage(httpError(401, { message: "Unauthorized" }))).toBe(
      "Current password is incorrect.",
    );
    expect(changePasswordErrorMessage(httpError(429, { retryAfterSec: 40 }))).toBe(
      "Too many attempts. Try again in 40s.",
    );
    expect(
      changePasswordErrorMessage(httpError(401, { attemptsLeft: 0, retryAfterSec: 60 })),
    ).toBe("Too many attempts. Try again in 60s.");
    expect(changePasswordErrorMessage(httpError(400, { message: "Too weak" }))).toBe("Too weak");
  });
});

describe("maskToken", () => {
  it("shows only the prefix", () => {
    expect(maskToken("qm_ab")).toBe("qm_ab••••••••");
  });
});
