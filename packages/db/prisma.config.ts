import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/** Repo root — Prisma cwd is often packages/db, so dotenv/config alone misses root .env. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
for (const rel of [".env", ".env.local", "apps/api/.env"]) {
  const filePath = resolve(root, rel);
  if (existsSync(filePath)) loadDotenv({ path: filePath, override: false });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
