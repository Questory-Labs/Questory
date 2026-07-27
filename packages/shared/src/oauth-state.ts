import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "./session";

export type OAuthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 15;

export function signOAuthState(
  userId: string,
  opts?: { ttlMs?: number; secret?: string; now?: number },
): string {
  const secret = opts?.secret ?? resolveSessionSecret();
  const now = opts?.now ?? Date.now();
  const payload: OAuthStatePayload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: now + (opts?.ttlMs ?? DEFAULT_TTL_MS),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(
  state: string | undefined | null,
  opts?: { secret?: string; now?: number },
): OAuthStatePayload | null {
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
    ) as OAuthStatePayload;
    if (!payload.userId || !payload.nonce || !payload.exp) return null;
    if (payload.exp < (opts?.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
