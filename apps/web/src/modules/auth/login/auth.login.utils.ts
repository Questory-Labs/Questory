import { sanitizeAppHref } from "@questorylabs/shared";
import type { ParsedApiError } from "@/lib/auth-api";
import { LOGIN_LOCKOUT_TIERS } from "./auth.login.constants";

export const safeNextPath = (raw: string | null): string => {
  if (!raw) return "/dashboard";
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const cleaned = sanitizeAppHref(decoded);
  return cleaned || "/dashboard";
};

export const formatPause = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  if (s < 60) return `${s} ${s === 1 ? "second" : "seconds"}`;
  const m = Math.ceil(s / 60);
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
};

export const formatCountdown = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const lockoutTiersCopy = (): string =>
  `Sign-in pauses after ${LOGIN_LOCKOUT_TIERS.map(
    (t) => `${t.failures} failed tries (${formatPause(t.pauseSec)})`,
  ).join(", ")}.`;

export const attemptsLeftCopy = (attemptsLeft: number): string =>
  attemptsLeft <= 0
    ? "Email or password is wrong. The next miss pauses sign-in."
    : `Email or password is wrong. ${attemptsLeft} ${
        attemptsLeft === 1 ? "try" : "tries"
      } left before sign-in pauses.`;

export const lockedCopy = (retryAfterSec: number | null): string =>
  retryAfterSec && retryAfterSec > 0
    ? `Too many attempts. Sign-in is paused for ${formatPause(retryAfterSec)}.`
    : "Too many attempts, try again later";

export type LoginFailure = {
  message: string;
  lockSec: number | null;
  credentials: boolean;
};

export const loginFailure = (
  parsed: ParsedApiError,
  fallback: string,
): LoginFailure => {
  if (
    parsed.status === 429 ||
    (parsed.status === 401 && (parsed.retryAfterSec ?? 0) > 0)
  ) {
    const sec = parsed.retryAfterSec ?? null;
    return { message: lockedCopy(sec), lockSec: sec, credentials: false };
  }
  if (parsed.status === 401 && parsed.attemptsLeft !== undefined) {
    return {
      message: attemptsLeftCopy(parsed.attemptsLeft),
      lockSec: null,
      credentials: true,
    };
  }
  return {
    message: fallback,
    lockSec: null,
    credentials: fallback === "Invalid email or password",
  };
};
