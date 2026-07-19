import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/** Delegates to packages/db — kept so local tooling that looks under apps/api still works. */
export default defineConfig({
  schema: "../../packages/db/prisma/schema.prisma",
  migrations: {
    path: "../../packages/db/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
