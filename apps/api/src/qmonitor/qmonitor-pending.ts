import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@questorylabs/shared/session";
import { QMONITOR_PENDING_TTL_MS } from "./qmonitor.constants";

export type QmonitorPendingPayload = {
  userId: string;
  state: string;
  redirectUri: string;
  deviceId: string;
  codeChallenge: string;
  exp: number;
};

export function signQmonitorPending(
  input: Omit<QmonitorPendingPayload, "exp"> & { exp?: number },
  opts?: { secret?: string; now?: number; ttlMs?: number },
): string {
  const secret = opts?.secret ?? resolveSessionSecret();
  const now = opts?.now ?? Date.now();
  const payload: QmonitorPendingPayload = {
    userId: input.userId,
    state: input.state,
    redirectUri: input.redirectUri,
    deviceId: input.deviceId,
    codeChallenge: input.codeChallenge,
    exp: input.exp ?? now + (opts?.ttlMs ?? QMONITOR_PENDING_TTL_MS),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyQmonitorPending(
  raw: string | undefined | null,
  opts?: { secret?: string; now?: number },
): QmonitorPendingPayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const secret = opts?.secret ?? resolveSessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as QmonitorPendingPayload;
    if (
      !payload.userId ||
      !payload.state ||
      !payload.redirectUri ||
      !payload.deviceId ||
      !payload.codeChallenge ||
      !payload.exp
    ) {
      return null;
    }
    if (payload.exp < (opts?.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
