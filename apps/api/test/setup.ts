process.env.APP_MODE = process.env.APP_MODE || "local";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || "test-session-secret-32chars!!";
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "file:./api-vitest.db";
process.env.CRON_SECRET = process.env.CRON_SECRET || "cron-test-secret";
