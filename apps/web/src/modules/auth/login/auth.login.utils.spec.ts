import { describe, expect, it } from "vitest";
import {
  attemptsLeftCopy,
  formatCountdown,
  formatPause,
  lockedCopy,
  lockoutTiersCopy,
  loginFailure,
  safeNextPath,
} from "./auth.login.utils";

describe("auth.login.utils", () => {
  it("keeps safe next paths and falls back to the dashboard", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("/library")).toBe("/library");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
  });

  it("formats pauses and countdowns", () => {
    expect(formatPause(1)).toBe("1 second");
    expect(formatPause(45)).toBe("45 seconds");
    expect(formatPause(60)).toBe("1 minute");
    expect(formatPause(900)).toBe("15 minutes");
    expect(formatCountdown(65)).toBe("1:05");
  });

  it("describes the real lockout tiers", () => {
    expect(lockoutTiersCopy()).toBe(
      "Sign-in pauses after 5 failed tries (1 minute), 10 failed tries (5 minutes), 20 failed tries (15 minutes).",
    );
  });

  it("words attempts left and lockouts", () => {
    expect(attemptsLeftCopy(3)).toBe(
      "Email or password is wrong. 3 tries left before sign-in pauses.",
    );
    expect(attemptsLeftCopy(1)).toContain("1 try left");
    expect(attemptsLeftCopy(0)).toContain("next miss pauses");
    expect(lockedCopy(300)).toBe(
      "Too many attempts. Sign-in is paused for 5 minutes.",
    );
    expect(lockedCopy(null)).toBe("Too many attempts, try again later");
  });

  it("maps login failures to copy and a lock", () => {
    expect(
      loginFailure({ message: "x", status: 429, retryAfterSec: 60 }, "f"),
    ).toEqual({
      message: "Too many attempts. Sign-in is paused for 1 minute.",
      lockSec: 60,
      credentials: false,
    });
    expect(
      loginFailure({ message: "x", status: 401, attemptsLeft: 2 }, "f"),
    ).toEqual({
      message: "Email or password is wrong. 2 tries left before sign-in pauses.",
      lockSec: null,
      credentials: true,
    });
    expect(
      loginFailure(
        { message: "x", status: 401, attemptsLeft: 0, retryAfterSec: 60 },
        "f",
      ),
    ).toEqual({
      message: "Too many attempts. Sign-in is paused for 1 minute.",
      lockSec: 60,
      credentials: false,
    });
    expect(
      loginFailure({ message: "x", status: 401 }, "Invalid email or password"),
    ).toMatchObject({ credentials: true, lockSec: null });
    expect(loginFailure({ message: "x", status: 400 }, "Nope")).toEqual({
      message: "Nope",
      lockSec: null,
      credentials: false,
    });
  });
});
