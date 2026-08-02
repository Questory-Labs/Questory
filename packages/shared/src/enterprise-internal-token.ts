import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "./session";

/** Short-lived token minted by the community API when proxying to QEngine. */
export const ENTERPRISE_INTERNAL_AUD = "qengine-internal";
export const ENTERPRISE_INTERNAL_MAX_AGE_MS = 60_000;

export type EnterpriseInternalClaims = {
  userId: string;
  isAdmin: boolean;
  aud: typeof ENTERPRISE_INTERNAL_AUD;
  exp: number;
};

export function resolveEnterpriseInternalSecret(
  envSecret = process.env.ENTERPRISE_INTERNAL_SECRET,
  sessionSecret = resolveSessionSecret(),
): string {
  const explicit = (envSecret || "").trim();
  if (explicit) return explicit;
  return sessionSecret;
}

export function signEnterpriseInternalBody(
  body: string,
  secret = resolveEnterpriseInternalSecret(),
): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeEnterpriseInternalToken(
  payload: { userId: string; isAdmin?: boolean; exp?: number },
  secret = resolveEnterpriseInternalSecret(),
): string {
  const full: EnterpriseInternalClaims = {
    userId: payload.userId,
    isAdmin: payload.isAdmin === true,
    aud: ENTERPRISE_INTERNAL_AUD,
    exp: payload.exp ?? Date.now() + ENTERPRISE_INTERNAL_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = signEnterpriseInternalBody(body, secret);
  return `${body}.${sig}`;
}

export function parseEnterpriseInternalToken(
  raw: string | undefined | null,
  secret = resolveEnterpriseInternalSecret(),
  now = Date.now(),
): EnterpriseInternalClaims | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const [body, sig] = trimmed.split(".");
  if (!body || !sig) return null;
  const expected = signEnterpriseInternalBody(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<EnterpriseInternalClaims>;
    if (!payload.userId || !payload.exp) return null;
    if (payload.aud !== ENTERPRISE_INTERNAL_AUD) return null;
    if (payload.exp < now) return null;
    return {
      userId: payload.userId,
      isAdmin: payload.isAdmin === true,
      aud: ENTERPRISE_INTERNAL_AUD,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
