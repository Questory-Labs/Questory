import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "questorylabs_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  steamId: string;
  exp: number;
};

export function resolveSessionSecret(
  envSecret = process.env.SESSION_SECRET,
): string {
  return (envSecret || "dev-secret").trim() || "dev-secret";
}

export function signSessionBody(
  body: string,
  secret = resolveSessionSecret(),
): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeSessionCookie(
  payload: Omit<SessionPayload, "exp"> & { exp?: number },
  secret = resolveSessionSecret(),
): string {
  const full: SessionPayload = {
    userId: payload.userId,
    steamId: payload.steamId,
    exp: payload.exp ?? Date.now() + SESSION_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = signSessionBody(body, secret);
  return `${body}.${sig}`;
}

export function parseSessionCookie(
  raw: string | undefined | null,
  secret = resolveSessionSecret(),
  now = Date.now(),
): SessionPayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = signSessionBody(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.userId || !payload.steamId || !payload.exp) return null;
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieDomainFromEnv(
  raw = process.env.COOKIE_DOMAIN,
): string | undefined {
  const value = (raw || "").trim();
  if (!value) return undefined;
  const host = value.replace(/^\./, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return undefined;
  }
  return value;
}

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  domain?: string;
};

export function sessionCookieOptions(
  nodeEnv = process.env.NODE_ENV,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    path: "/",
    domain: cookieDomainFromEnv(),
  };
}
