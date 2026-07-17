import { Request } from "express";

/**
 * Nest/Express qs can turn `openid.claimed_id` into `{ openid: { claimed_id } }`.
 * Steam OpenID needs flat dotted keys for verification.
 */
export function flattenOpenIdQuery(
  query: Record<string, unknown>,
): Record<string, string> {
  const flat: Record<string, string> = {};

  const walk = (value: unknown, prefix = "") => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      if (prefix) flat[prefix] = String(value);
      return;
    }
    if (Array.isArray(value)) {
      if (prefix && value[0] != null) flat[prefix] = String(value[0]);
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, prefix ? `${prefix}.${key}` : key);
      }
    }
  };

  walk(query);
  return flat;
}

export function openIdQueryFromRequest(req: Request): Record<string, string> {
  const fromParsed = flattenOpenIdQuery(
    (req.query || {}) as Record<string, unknown>,
  );
  if (fromParsed["openid.claimed_id"] || fromParsed["openid.identity"]) {
    return fromParsed;
  }

  // Fallback: parse the raw query string so dots stay literal
  const raw = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?") + 1) : "";
  const params = new URLSearchParams(raw);
  const flat: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    flat[key] = value;
  }
  return flat;
}

export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/i,
  );
  return match?.[1] ?? null;
}
