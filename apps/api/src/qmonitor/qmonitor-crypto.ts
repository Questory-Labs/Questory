import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@questorylabs/shared/session";
import { QMONITOR_ACCESS_TTL_MS } from "./qmonitor.constants";

export type QmonitorAccessClaims = {
  sub: string;
  sid: string;
  exp: number;
};

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashDeviceId(deviceId: string): string {
  return createHash("sha256").update(deviceId, "utf8").digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function pkceS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function tokenSecret(): string {
  return (
    (process.env.QMONITOR_TOKEN_SECRET || "").trim() || resolveSessionSecret()
  );
}

export function signAccessToken(
  claims: Omit<QmonitorAccessClaims, "exp"> & { exp?: number },
  opts?: { secret?: string; now?: number; ttlMs?: number },
): string {
  const secret = opts?.secret ?? tokenSecret();
  const now = opts?.now ?? Date.now();
  const full: QmonitorAccessClaims = {
    sub: claims.sub,
    sid: claims.sid,
    exp: claims.exp ?? now + (opts?.ttlMs ?? QMONITOR_ACCESS_TTL_MS),
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAccessToken(
  token: string | undefined | null,
  opts?: { secret?: string; now?: number },
): QmonitorAccessClaims | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const secret = opts?.secret ?? tokenSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqualStr(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as QmonitorAccessClaims;
    if (!payload.sub || !payload.sid || !payload.exp) return null;
    if (payload.exp < (opts?.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
