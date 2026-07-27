/**
 * Pre-db:push migration: copy User.steamId / musicUsername into Account
 * before those columns are dropped by the new schema.
 *
 * Safe to re-run. No-ops when legacy columns are already gone or Account exists.
 */
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function loadEnv() {
  for (const rel of [".env", "apps/api/.env"]) {
    const p = resolve(root, rel);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

function sqlitePath(url) {
  const raw = url.replace(/^file:/, "");
  if (raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) return raw;
  // Relative to apps/api (Prisma cwd for api) or packages/db
  const candidates = [
    resolve(root, "apps/api", raw),
    resolve(root, "packages/db", raw),
    resolve(root, raw),
  ];
  return candidates.find((c) => existsSync(c)) || candidates[0];
}

function loadBetterSqlite3() {
  const candidates = [
    resolve(root, "node_modules/better-sqlite3"),
    resolve(root, "apps/api/node_modules/better-sqlite3"),
    resolve(root, "packages/db/node_modules/better-sqlite3"),
    "better-sqlite3",
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      /* try next */
    }
  }
  return null;
}

function migrateSqlite(dbPath) {
  const Database = loadBetterSqlite3();
  if (!Database) {
    console.warn(
      "[migrate-identity] better-sqlite3 not available; skip SQLite migrate",
    );
    return;
  }
  if (!existsSync(dbPath)) {
    console.log(`[migrate-identity] no DB at ${dbPath}; skip`);
    return;
  }
  const db = new Database(dbPath);
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    if (!tables.includes("User")) {
      console.log("[migrate-identity] no User table; skip");
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "displayName" TEXT,
        "metadata" TEXT NOT NULL DEFAULT '{}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
        ON "Account"("provider", "providerAccountId");
      CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
      CREATE INDEX IF NOT EXISTS "Account_provider_idx" ON "Account"("provider");
    `);

    const cols = db
      .prepare("PRAGMA table_info(User)")
      .all()
      .map((c) => c.name);

    const now = new Date().toISOString();
    let steam = 0;
    let music = 0;

    if (cols.includes("steamId")) {
      const rows = db
        .prepare(
          `SELECT id, steamId, personaName FROM User WHERE steamId IS NOT NULL AND steamId != ''`,
        )
        .all();
      const insert = db.prepare(`
        INSERT OR IGNORE INTO Account (id, userId, provider, providerAccountId, displayName, metadata, createdAt, updatedAt)
        VALUES (@id, @userId, 'steam', @providerAccountId, @displayName, '{}', @now, @now)
      `);
      for (const row of rows) {
        const r = insert.run({
          id: `acc_steam_${row.id}`,
          userId: row.id,
          providerAccountId: row.steamId,
          displayName: row.personaName || null,
          now,
        });
        steam += r.changes;
      }
    }

    if (cols.includes("musicUsername")) {
      const rows = db
        .prepare(
          `SELECT id, musicUsername, personaName FROM User WHERE musicUsername IS NOT NULL AND musicUsername != ''`,
        )
        .all();
      const insert = db.prepare(`
        INSERT OR IGNORE INTO Account (id, userId, provider, providerAccountId, displayName, metadata, createdAt, updatedAt)
        VALUES (@id, @userId, 'listenbrainz', @providerAccountId, @displayName, '{}', @now, @now)
      `);
      for (const row of rows) {
        const r = insert.run({
          id: `acc_lb_${row.id}`,
          userId: row.id,
          providerAccountId: row.musicUsername,
          displayName: row.personaName || row.musicUsername,
          now,
        });
        music += r.changes;
      }
    }

    console.log(
      `[migrate-identity] sqlite ${dbPath}: steam=${steam} listenbrainz=${music}`,
    );
  } finally {
    db.close();
  }
}

async function migratePostgres(url) {
  let pg;
  try {
    pg = require("pg");
  } catch {
    console.warn("[migrate-identity] pg not available; skip Postgres migrate");
    return;
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "displayName" TEXT,
        "metadata" TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
        ON "Account"("provider", "providerAccountId");
      CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
      CREATE INDEX IF NOT EXISTS "Account_provider_idx" ON "Account"("provider");
    `);

    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User' AND table_schema = 'public'
    `);
    const names = new Set(cols.rows.map((r) => r.column_name));

    if (names.has("steamId")) {
      const r = await client.query(`
        INSERT INTO "Account" (id, "userId", provider, "providerAccountId", "displayName", metadata, "createdAt", "updatedAt")
        SELECT 'acc_steam_' || id, id, 'steam', "steamId", "personaName", '{}', NOW(), NOW()
        FROM "User"
        WHERE "steamId" IS NOT NULL AND "steamId" != ''
        ON CONFLICT (provider, "providerAccountId") DO NOTHING
      `);
      console.log(`[migrate-identity] postgres steam=${r.rowCount}`);
    }
    if (names.has("musicUsername")) {
      const r = await client.query(`
        INSERT INTO "Account" (id, "userId", provider, "providerAccountId", "displayName", metadata, "createdAt", "updatedAt")
        SELECT 'acc_lb_' || id, id, 'listenbrainz', "musicUsername", COALESCE("personaName", "musicUsername"), '{}', NOW(), NOW()
        FROM "User"
        WHERE "musicUsername" IS NOT NULL AND "musicUsername" != ''
        ON CONFLICT (provider, "providerAccountId") DO NOTHING
      `);
      console.log(`[migrate-identity] postgres listenbrainz=${r.rowCount}`);
    }
  } finally {
    await client.end();
  }
}

loadEnv();
const url = (process.env.DATABASE_URL || "").trim();
if (!url) {
  console.log("[migrate-identity] DATABASE_URL unset; skip");
  process.exit(0);
}

if (url.startsWith("file:")) {
  migrateSqlite(sqlitePath(url));
} else if (url.startsWith("postgres")) {
  await migratePostgres(url);
} else {
  console.log(`[migrate-identity] unsupported DATABASE_URL scheme; skip`);
}
