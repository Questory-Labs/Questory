export function resolveDbProvider(): "sqlite" | "postgresql" {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "sqlite" || explicit === "sqlite3") return "sqlite";
  if (explicit === "postgres" || explicit === "postgresql") return "postgresql";

  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }
  return "sqlite";
}

export function resolveAppMode(): string {
  return (process.env.APP_MODE || "local").trim().toLowerCase();
}

/** Sole-user unauthenticated attach only in local/selfhosted. */
export function allowsSoleUserFallback(): boolean {
  const mode = resolveAppMode();
  return mode === "local" || mode === "selfhosted";
}

/** Webhooks must be authenticated outside local. */
export function isWebhookSecretRequired(): boolean {
  return resolveAppMode() !== "local";
}

export function resolveWatchPort(): number {
  const n = Number(process.env.WATCH_PORT || 4020);
  return Number.isFinite(n) && n > 0 ? n : 4020;
}

export function resolveTraktClientId(): string {
  return (process.env.TRAKT_CLIENT_ID || "").trim();
}

export function resolveTraktClientSecret(): string {
  return (process.env.TRAKT_CLIENT_SECRET || "").trim();
}

export function resolveTraktRedirectUri(): string {
  return (
    process.env.TRAKT_REDIRECT_URI ||
    "http://localhost:4020/v1/trakt/callback"
  ).trim();
}

export function resolveTmdbApiKey(): string {
  return (process.env.TMDB_API_KEY || "").trim();
}

export function resolveAniListClientId(): string {
  return (process.env.ANILIST_CLIENT_ID || "").trim();
}

export function resolveAniListClientSecret(): string {
  return (process.env.ANILIST_CLIENT_SECRET || "").trim();
}

export function resolveAniListRedirectUri(): string {
  return (
    process.env.ANILIST_REDIRECT_URI ||
    "http://localhost:4020/v1/anilist/callback"
  ).trim();
}

export function isApiSecretRequired(): boolean {
  const mode = resolveAppMode();
  if (mode === "local") {
    return Boolean((process.env.WATCH_API_SECRET || "").trim());
  }
  return true;
}

export function resolveWatchApiSecret(): string {
  return (process.env.WATCH_API_SECRET || "").trim();
}
