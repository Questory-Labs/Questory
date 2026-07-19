import { CookieOptions, Request, Response } from "express";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  encodeSessionCookie,
  parseSessionCookie,
  sessionCookieOptions,
  type SessionPayload,
} from "@questorylabs/shared/session";

export type { SessionPayload };

export function setSession(res: Response, payload: Omit<SessionPayload, "exp">) {
  const value = encodeSessionCookie(payload);
  const opts = sessionCookieOptions() as CookieOptions;
  res.cookie(SESSION_COOKIE_NAME, value, {
    ...opts,
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions() as CookieOptions);
}

export function readSession(req: Request): SessionPayload | null {
  const raw = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  return parseSessionCookie(raw);
}
