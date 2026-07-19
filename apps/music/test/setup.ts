process.env.APP_MODE = process.env.APP_MODE || "local";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || "test-session-secret-32chars!!";
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "file:./music-vitest.db";
