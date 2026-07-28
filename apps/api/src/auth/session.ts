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

function cookieHintsFromRequest(req?: Request) {
  const origin =
    (req?.headers?.origin as string | undefined) ||
    (req?.headers?.referer as string | undefined) ||
    process.env.WEB_ORIGIN;
  return {
    publicOrigin: origin,
    requestSecure: req?.secure,
  };
}

export function setSession(
  res: Response,
  payload: Omit<SessionPayload, "exp">,
  req?: Request,
) {
  const value = encodeSessionCookie(payload);
  const opts = sessionCookieOptions(cookieHintsFromRequest(req)) as CookieOptions;
  res.cookie(SESSION_COOKIE_NAME, value, {
    ...opts,
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSession(res: Response, req?: Request) {
  res.clearCookie(
    SESSION_COOKIE_NAME,
    sessionCookieOptions(cookieHintsFromRequest(req)) as CookieOptions,
  );
}

export function readSession(req: Request): SessionPayload | null {
  const raw = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  return parseSessionCookie(raw);
}
