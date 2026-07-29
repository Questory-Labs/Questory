import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@questorylabs/shared/session";

export type MalOAuthStatePayload = {
  userId: string;
  codeVerifier: string;
  nonce: string;
  exp: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 15;

export function generateMalPkce() {
  const codeVerifier = randomBytes(48)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9\-._~]/g, "a")
    .slice(0, 128);
  return {
    codeVerifier,
    codeChallenge: codeVerifier,
  };
}

export function signMalOAuthState(
  userId: string,
  codeVerifier: string,
  opts?: { ttlMs?: number; secret?: string; now?: number },
): string {
  const secret = opts?.secret ?? resolveSessionSecret();
  const now = opts?.now ?? Date.now();
  const payload: MalOAuthStatePayload = {
    userId,
    codeVerifier,
    nonce: randomBytes(16).toString("hex"),
    exp: now + (opts?.ttlMs ?? DEFAULT_TTL_MS),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMalOAuthState(
  state: string | undefined | null,
  opts?: { secret?: string; now?: number },
): MalOAuthStatePayload | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const secret = opts?.secret ?? resolveSessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as MalOAuthStatePayload;
    if (!payload.userId || !payload.codeVerifier || !payload.exp) return null;
    if (payload.exp < (opts?.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
