/**
 * delete all Letterboxd import data so you can re-import cleanly.
 *
 *   node scripts/tmp-delete-letterboxd.mjs          # preview counts
 *   node scripts/tmp-delete-letterboxd.mjs --yes      # delete
 *   node scripts/tmp-delete-letterboxd.mjs --yes --user <userId>
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function hourStartUtc(d) {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
    ),
  );
}

function parseArgs(argv) {
  let userId = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--user" && argv[i + 1]) {
      userId = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--user=")) {
      userId = arg.slice("--user=".length);
    }
  }
  return {
    yes: argv.includes("--yes"),
    userId,
  };
}

loadEnv();

const { yes, userId } = parseArgs(process.argv.slice(2));
const url = process.env.DATABASE_URL || "";

if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.error(
    "[tmp-delete-letterboxd] Postgres DATABASE_URL required (sqlite not supported in this temp script).",
  );
  process.exit(1);
}

const pg = require(resolve(root, "apps/api/node_modules/pg"));
const client = new pg.Client({ connectionString: url });

const SOURCE = "letterboxd_csv";
const MIGRATION_KEY = "letterboxd_watch_dedupe_v1";

async function count(table, extraWhere = "", params = []) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM "${table}" WHERE source = $1${extraWhere}`,
    [SOURCE, ...params],
  );
  return rows[0]?.n ?? 0;
}

async function rebuildWatchHourBuckets(uid) {
  await client.query(`DELETE FROM "WatchHourBucket" WHERE "userId" = $1`, [uid]);
  const { rows } = await client.query(
    `
      SELECT e."watchedAt", e."runtimeMinutes", t."runtimeMinutes" AS title_runtime
      FROM "WatchEvent" e
      INNER JOIN "Title" t ON t.id = e."titleId"
      WHERE e."userId" = $1
      ORDER BY e."watchedAt" ASC
    `,
    [uid],
  );

  const buckets = new Map();
  for (const row of rows) {
    const at = new Date(row.watchedAt);
    const hourStart = hourStartUtc(at);
    const key = hourStart.toISOString();
    const minutes = Math.max(
      0,
      row.runtimeMinutes ?? row.title_runtime ?? 0,
    );
    const bucket = buckets.get(key) ?? { watchCount: 0, minutesWatched: 0 };
    bucket.watchCount += 1;
    bucket.minutesWatched += minutes;
    buckets.set(key, bucket);
  }

  for (const [iso, bucket] of buckets) {
    const id = `wb_${uid}_${iso.replace(/[:.]/g, "")}`;
    await client.query(
      `
        INSERT INTO "WatchHourBucket" (id, "userId", "hourStart", "watchCount", "minutesWatched")
        VALUES ($1, $2, $3::timestamptz, $4, $5)
      `,
      [id, uid, iso, bucket.watchCount, bucket.minutesWatched],
    );
  }

  return buckets.size;
}

try {
  await client.connect();

  const userFilter = userId ? ` AND "userId" = $2` : "";
  const userParams = userId ? [userId] : [];

  const { rows: userRows } = await client.query(
    `
      SELECT DISTINCT "userId"
      FROM "WatchEvent"
      WHERE source = $1${userFilter}
    `,
    [SOURCE, ...userParams],
  );

  const listUsers = userId ? [userId] : userRows.map((r) => r.userId);

  const watchEvents = await count("WatchEvent", userFilter, userParams);
  const listStates = await count("TitleListState", userFilter, userParams);
  const importJobs = await count("ImportJob", userFilter, userParams);

  const { rows: migrationRows } = await client.query(
    `SELECT key, status, "runCount" FROM "DataMigration" WHERE key = $1`,
    [MIGRATION_KEY],
  );

  console.log("[tmp-delete-letterboxd] preview");
  console.log(`  user filter: ${userId ?? "all users"}`);
  console.log(`  WatchEvent (source=${SOURCE}): ${watchEvents}`);
  console.log(`  TitleListState (source=${SOURCE}): ${listStates}`);
  console.log(`  ImportJob (source=${SOURCE}): ${importJobs}`);
  console.log(
    `  users with letterboxd watches to rebuild buckets: ${listUsers.length}`,
  );
  if (migrationRows.length) {
    console.log(
      `  DataMigration ${MIGRATION_KEY}: status=${migrationRows[0].status} runs=${migrationRows[0].runCount}`,
    );
  }

  if (!yes) {
    console.log("\nNothing deleted. Re-run with --yes to wipe Letterboxd data.");
    process.exit(0);
  }

  await client.query("BEGIN");

  const delWatch = await client.query(
    `DELETE FROM "WatchEvent" WHERE source = $1${userFilter}`,
    [SOURCE, ...userParams],
  );
  const delLists = await client.query(
    `DELETE FROM "TitleListState" WHERE source = $1${userFilter}`,
    [SOURCE, ...userParams],
  );
  const delJobs = await client.query(
    `DELETE FROM "ImportJob" WHERE source = $1${userFilter}`,
    [SOURCE, ...userParams],
  );
  const delMigration = await client.query(
    `DELETE FROM "DataMigration" WHERE key = $1`,
    [MIGRATION_KEY],
  );

  let rebuilt = 0;
  for (const uid of listUsers) {
    rebuilt += await rebuildWatchHourBuckets(uid);
  }

  await client.query("COMMIT");

  console.log("\n[tmp-delete-letterboxd] deleted");
  console.log(`  WatchEvent rows: ${delWatch.rowCount}`);
  console.log(`  TitleListState rows: ${delLists.rowCount}`);
  console.log(`  ImportJob rows: ${delJobs.rowCount}`);
  console.log(`  DataMigration rows: ${delMigration.rowCount}`);
  console.log(`  watch hour buckets rebuilt for ${listUsers.length} user(s)`);
  console.log("\nRe-import Letterboxd from Watch settings.");
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* ignore */
  }
  console.error("[tmp-delete-letterboxd] failed:", err);
  process.exit(1);
} finally {
  await client.end();
}
