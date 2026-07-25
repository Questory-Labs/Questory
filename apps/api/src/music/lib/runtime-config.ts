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
