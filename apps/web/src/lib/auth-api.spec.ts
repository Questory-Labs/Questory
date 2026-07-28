import { describe, expect, it } from "vitest";
import {
  formatAuthError,
  isChallengeError,
  isChallengeKeepAliveError,
  parseApiError,
  shouldAutoRetryChallenge,
} from "./auth-api";

describe("parseApiError", () => {
  it("parses Nest JSON bodies and status on Error", () => {
    const err = new Error(
      JSON.stringify({
        statusCode: 400,
        message: "Invalid or expired challenge",
      }),
    ) as Error & { status?: number };
    err.status = 400;
    expect(parseApiError(err)).toEqual({
      message: "Invalid or expired challenge",
      status: 400,
    });
  });
});

describe("challenge error helpers", () => {
  it("detects challenge vs keep-alive vs auto-retry", () => {
    expect(isChallengeError("Invalid or expired challenge")).toBe(true);
    expect(isChallengeKeepAliveError("Please try again")).toBe(true);
    expect(isChallengeKeepAliveError("Invalid or expired challenge")).toBe(
      false,
    );
    expect(shouldAutoRetryChallenge("Invalid or expired challenge")).toBe(
      true,
    );
    expect(shouldAutoRetryChallenge("Please try again")).toBe(false);
  });
});

describe("formatAuthError", () => {
  it("does not remap challenge failures to wrong password", () => {
    const err = new Error(
      JSON.stringify({
        statusCode: 400,
        message: "Invalid or expired challenge",
      }),
    );
    expect(formatAuthError(err, "login")).toBe(
      "Sign-in session expired. Try again.",
    );
    expect(formatAuthError(err, "register")).toBe(
      "Registration session expired. Try again.",
    );
  });

  it("keeps credential errors on login", () => {
    const err = new Error(
      JSON.stringify({
        statusCode: 401,
        message: "Invalid email or password",
      }),
    );
    expect(formatAuthError(err, "login")).toBe("Invalid email or password");
  });

  it("surfaces challenge errors on register instead of generic unable", () => {
    const err = new Error(
      JSON.stringify({
        statusCode: 400,
        message: "Please try again",
      }),
    );
    expect(formatAuthError(err, "register")).toBe(
      "Please wait a moment and try again.",
    );
  });
});
