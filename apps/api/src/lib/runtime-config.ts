export type DbProvider = "sqlite" | "postgresql";

export type AppMode =
  | "local"
  | "selfhosted"
  | "selfhosted-full"
  | "production";

const APP_MODES: readonly AppMode[] = [
  "local",
  "selfhosted",
  "selfhosted-full",
  "production",
] as const;

const WEAK_SESSION_SECRETS = new Set([
  "",
  "dev-secret",
  "change-me",
  "change-me-to-a-long-random-string",
  "change-me-in-production",
]);

export function resolveAppMode(): AppMode {
  const raw = (process.env.APP_MODE || "").toLowerCase().trim();
  if ((APP_MODES as readonly string[]).includes(raw)) {
    return raw as AppMode;
  }
  return "local";
}

export function resolveDbProvider(): DbProvider {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "sqlite" || explicit === "sqlite3") return "sqlite";
  if (explicit === "postgres" || explicit === "postgresql") return "postgresql";

  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }

  const mode = resolveAppMode();
  if (mode === "selfhosted-full" || mode === "production") {
    return "postgresql";
  }
  return "sqlite";
}

export function resolveRedisConfig() {
  const url = (process.env.REDIS_URL || "").trim();
  const forceInline = process.env.USE_INLINE_SYNC === "true";
  const enabled = Boolean(url) && !forceInline;
  return {
    url,
    enabled,
    forceInline,
    mode: enabled ? ("redis" as const) : ("memory" as const),
  };
}

export function resolveSyncMode() {
  const redis = resolveRedisConfig();
  return redis.enabled ? ("queue" as const) : ("inline" as const);
}

/** Parse ALLOWED_STEAM_IDS. Empty / unset = open signup. */
export function resolveAllowedSteamIds(): Set<string> {
  const raw = process.env.ALLOWED_STEAM_IDS || "";
  const ids = raw
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return new Set(ids);
}

export function isSteamIdAllowed(steamId: string): boolean {
  const allowlist = resolveAllowedSteamIds();
  if (allowlist.size === 0) return true;
  return allowlist.has(steamId);
}

export function isAllowlistEnabled(): boolean {
  return resolveAllowedSteamIds().size > 0;
}

function isEnvTrue(value: string | undefined): boolean {
  const v = (value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Hosted Questory cloud (not self-host). Drives mail-required + per-user entitlements. */
export function isQuestoryCloud(): boolean {
  return isEnvTrue(process.env.QUESTORY_CLOUD);
}

/** Sole-user unauthenticated attach only in local/selfhosted. */
export function allowsSoleUserFallback(): boolean {
  const mode = resolveAppMode();
  return mode === "local" || mode === "selfhosted";
}

function isWeakSessionSecret(secret: string | undefined): boolean {
  const value = (secret || "").trim();
  if (WEAK_SESSION_SECRETS.has(value)) return true;
  if (value.toLowerCase().startsWith("change-me")) return true;
  return value.length < 16;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return true;
  }
}

/**
 * Fail fast on boot for modes that need durable infra / real secrets.
 * Applies light defaults documentation via errors rather than mutating env.
 */
export function assertModeConfig(): void {
  const mode = resolveAppMode();
  const errors: string[] = [];

  const sessionSecret = process.env.SESSION_SECRET;
  const steamKey = (process.env.STEAM_API_KEY || "").trim();
  const dbProvider = resolveDbProvider();
  const redis = resolveRedisConfig();
  const steamRealm = process.env.STEAM_REALM || "";
  const steamReturn =
    process.env.STEAM_RETURN_URL ||
    "http://localhost:4000/auth/steam/callback";
  const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000";

  if (mode === "selfhosted-full" || mode === "production") {
    if (dbProvider !== "postgresql") {
      errors.push(
        `${mode} requires DATABASE_PROVIDER=postgresql (or a postgresql:// DATABASE_URL)`,
      );
    }
    if (!redis.url) {
      errors.push(`${mode} requires REDIS_URL for cache and sync queues`);
    }
    if (redis.forceInline) {
      errors.push(
        `${mode} should not set USE_INLINE_SYNC=true when using Redis queues`,
      );
    }
    if (isWeakSessionSecret(sessionSecret)) {
      errors.push(
        `${mode} requires a strong SESSION_SECRET (min 16 chars, not a placeholder)`,
      );
    }
    if (!steamKey) {
      errors.push(`${mode} requires STEAM_API_KEY`);
    }
  }

  if (mode === "selfhosted") {
    if (isWeakSessionSecret(sessionSecret)) {
      errors.push(
        `selfhosted requires a strong SESSION_SECRET (min 16 chars, not a placeholder)`,
      );
    }
    if (!steamKey) {
      errors.push(`selfhosted requires STEAM_API_KEY`);
    }
  }

  if (mode === "production") {
    if (isLocalhostUrl(steamRealm) || isLocalhostUrl(steamReturn)) {
      errors.push(
        "production requires public STEAM_REALM and STEAM_RETURN_URL (not localhost)",
      );
    }
    if (isLocalhostUrl(webOrigin)) {
      errors.push("production requires a public WEB_ORIGIN (not localhost)");
    }
    const publicApi = process.env.NEXT_PUBLIC_API_URL || "";
    if (publicApi && isLocalhostUrl(publicApi)) {
      errors.push(
        "production should not use a localhost NEXT_PUBLIC_API_URL on the API host checklist",
      );
    }
  }

  if (isQuestoryCloud()) {
    const smtpHost = (process.env.SMTP_HOST || "").trim();
    const smtpFrom = (process.env.SMTP_FROM || "").trim();
    if (!isEnvTrue(process.env.SMTP_ENABLED) || !smtpHost || !smtpFrom) {
      errors.push(
        "QUESTORY_CLOUD requires SMTP_ENABLED=true plus SMTP_HOST and SMTP_FROM",
      );
    }
  }

  if (errors.length > 0) {
    const detail = errors.map((e) => `  - ${e}`).join("\n");
    throw new Error(
      `Invalid configuration for APP_MODE=${mode}:\n${detail}\nSee .env.example and docs/self-hosting.md`,
    );
  }
}
