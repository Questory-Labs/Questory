export type AppMode = "local" | "selfhosted" | "selfhosted-full" | "production";

export function resolveAppMode(): AppMode {
  const raw = (process.env.APP_MODE || "local").toLowerCase().trim();
  if (
    raw === "local" ||
    raw === "selfhosted" ||
    raw === "selfhosted-full" ||
    raw === "production"
  ) {
    return raw;
  }
  return "local";
}

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

export function resolveLastFmApiKey(): string {
  return (process.env.LASTFM_API_KEY || "").trim();
}

export function resolveLastFmApiSecret(): string {
  return (process.env.LASTFM_API_SECRET || "").trim();
}

export function resolveLastFmRedirectUri(): string {
  const explicit = (process.env.LASTFM_REDIRECT_URI || "").trim();
  if (explicit) return explicit;
  const port = Number(process.env.API_PORT || 4000);
  const fallbackPort = Number.isFinite(port) && port > 0 ? port : 4000;
  return `http://localhost:${fallbackPort}/v1/music/scrobbler/lastfm/callback`;
}

export function isLastFmConfigured(): boolean {
  return Boolean(
    resolveLastFmApiKey() &&
      resolveLastFmApiSecret() &&
      (process.env.LASTFM_REDIRECT_URI || "").trim(),
  );
}
