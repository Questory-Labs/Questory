import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "questorylabs_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  /** Linked SteamID64 when present; null for email-only users. */
  steamId: string | null;
  /** Must match User.sessionEpoch; missing/legacy cookies count as 0. */
  epoch: number;
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
    steamId: payload.steamId ?? null,
    epoch: payload.epoch ?? 0,
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
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < now) return null;
    return {
      userId: payload.userId,
      steamId:
        typeof payload.steamId === "string" && payload.steamId.length > 0
          ? payload.steamId
          : null,
      epoch: typeof payload.epoch === "number" && Number.isFinite(payload.epoch)
        ? payload.epoch
        : 0,
      exp: payload.exp,
    };
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

export type CookieSecureHints = {
  /** Explicit COOKIE_SECURE override ("true"/"false"/"1"/"0"/…). */
  cookieSecureEnv?: string | undefined;
  /** Browser-facing URL (Origin, Referer, or WEB_ORIGIN). */
  publicOrigin?: string | undefined;
  /** Express `req.secure` / trusted `X-Forwarded-Proto`. */
  requestSecure?: boolean | undefined;
  nodeEnv?: string | undefined;
};

/** True when URL scheme is https; false for http; null if unknown. */
export function schemeIsHttps(urlOrOrigin: string | undefined): boolean | null {
  const raw = (urlOrOrigin || "").trim();
  if (!raw) return null;
  try {
    const protocol = new URL(raw).protocol;
    if (protocol === "https:") return true;
    if (protocol === "http:") return false;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Decide the Secure cookie flag.
 * Order: COOKIE_SECURE override → public origin scheme → request TLS → NODE_ENV.
 */
export function resolveCookieSecure(hints: CookieSecureHints = {}): boolean {
  const raw = (
    hints.cookieSecureEnv ??
    process.env.COOKIE_SECURE ??
    ""
  )
    .trim()
    .toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;

  const fromOrigin = schemeIsHttps(hints.publicOrigin);
  if (fromOrigin !== null) return fromOrigin;

  if (typeof hints.requestSecure === "boolean") return hints.requestSecure;

  const nodeEnv = hints.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "production";
}

export function sessionCookieOptions(
  hints: CookieSecureHints | string = {},
): SessionCookieOptions {
  // Back-compat: sessionCookieOptions("production") / ("development")
  const normalized: CookieSecureHints =
    typeof hints === "string" ? { nodeEnv: hints } : hints;
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: resolveCookieSecure(normalized),
    path: "/",
    domain: cookieDomainFromEnv(),
  };
}
