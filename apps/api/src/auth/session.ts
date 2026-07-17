import { CookieOptions, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "questorylabs_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  steamId: string;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET || "dev-secret";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/**
 * Browsers reject Domain=localhost (and Domain=127.0.0.1).
 * Only set Domain for real hostnames (e.g. .example.com in prod).
 */
function cookieDomain(): string | undefined {
  const raw = (process.env.COOKIE_DOMAIN || "").trim();
  if (!raw) return undefined;
  const host = raw.replace(/^\./, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return undefined;
  }
  return raw;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: cookieDomain(),
  };
}

export function setSession(res: Response, payload: Omit<SessionPayload, "exp">) {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = sign(body);
  const value = `${body}.${sig}`;
  res.cookie(COOKIE_NAME, value, {
    ...cookieOptions(),
    maxAge: MAX_AGE_MS,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export function readSession(req: Request): SessionPayload | null {
  const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
