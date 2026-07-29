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

export function resolveApiPort(): number {
  const n = Number(process.env.API_PORT || 4000);
  return Number.isFinite(n) && n > 0 ? n : 4000;
}

export function resolveTraktClientId(): string {
  return (process.env.TRAKT_CLIENT_ID || "").trim();
}

export function resolveTraktClientSecret(): string {
  return (process.env.TRAKT_CLIENT_SECRET || "").trim();
}

export function resolveTraktRedirectUri(): string {
  const port = resolveApiPort();
  return (
    process.env.TRAKT_REDIRECT_URI ||
    `http://localhost:${port}/v1/watch/trakt/callback`
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
  const port = resolveApiPort();
  return (
    process.env.ANILIST_REDIRECT_URI ||
    `http://localhost:${port}/v1/watch/anilist/callback`
  ).trim();
}

export function resolveMalClientId(): string {
  return (process.env.MAL_CLIENT_ID || "").trim();
}

export function resolveMalClientSecret(): string {
  return (process.env.MAL_CLIENT_SECRET || "").trim();
}

export function resolveMalRedirectUri(): string {
  const port = resolveApiPort();
  return (
    process.env.MAL_REDIRECT_URI ||
    `http://localhost:${port}/v1/watch/mal/callback`
  ).trim();
}

export function resolveShikimoriClientId(): string {
  return (process.env.SHIKIMORI_CLIENT_ID || "").trim();
}

export function resolveShikimoriClientSecret(): string {
  return (process.env.SHIKIMORI_CLIENT_SECRET || "").trim();
}

export function resolveShikimoriRedirectUri(): string {
  const port = resolveApiPort();
  return (
    process.env.SHIKIMORI_REDIRECT_URI ||
    `http://localhost:${port}/v1/watch/shikimori/callback`
  ).trim();
}

export function resolveBangumiClientId(): string {
  return (process.env.BANGUMI_CLIENT_ID || "").trim();
}

export function resolveBangumiClientSecret(): string {
  return (process.env.BANGUMI_CLIENT_SECRET || "").trim();
}

export function resolveBangumiRedirectUri(): string {
  const port = resolveApiPort();
  return (
    process.env.BANGUMI_REDIRECT_URI ||
    `http://localhost:${port}/v1/watch/bangumi/callback`
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
