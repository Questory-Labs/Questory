import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../dev.db");
const db = new Database(dbPath);

function cols(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

const wcols = cols("WishlistItem");
console.log("WishlistItem cols", wcols);

if (!wcols.includes("store")) {
  db.exec(`ALTER TABLE WishlistItem ADD COLUMN store TEXT NOT NULL DEFAULT 'steam'`);
}
if (!wcols.includes("externalId")) {
  db.exec(`ALTER TABLE WishlistItem ADD COLUMN externalId TEXT NOT NULL DEFAULT ''`);
}
if (!wcols.includes("gameId")) {
  db.exec(`ALTER TABLE WishlistItem ADD COLUMN gameId TEXT`);
}

db.exec(`UPDATE WishlistItem SET store = 'steam' WHERE store IS NULL OR store = ''`);
db.exec(
  `UPDATE WishlistItem SET externalId = CAST(appId AS TEXT) WHERE externalId IS NULL OR externalId = ''`,
);

const dups = db
  .prepare(
    `SELECT userId, store, externalId, COUNT(*) c FROM WishlistItem GROUP BY userId, store, externalId HAVING c > 1`,
  )
  .all();
for (const d of dups) {
  const rows = db
    .prepare(
      `SELECT id FROM WishlistItem WHERE userId=? AND store=? AND externalId=? ORDER BY id`,
    )
    .all(d.userId, d.store, d.externalId);
  for (const r of rows.slice(1)) {
    db.prepare(`DELETE FROM WishlistItem WHERE id=?`).run(r.id);
  }
}

const pcols = cols("Purchase");
if (!pcols.includes("store")) {
  db.exec(`ALTER TABLE Purchase ADD COLUMN store TEXT NOT NULL DEFAULT 'steam'`);
}
if (!pcols.includes("externalId")) {
  db.exec(`ALTER TABLE Purchase ADD COLUMN externalId TEXT`);
}
if (!pcols.includes("gameId")) {
  db.exec(`ALTER TABLE Purchase ADD COLUMN gameId TEXT`);
}
db.exec(
  `UPDATE Purchase SET externalId = CAST(appId AS TEXT) WHERE externalId IS NULL AND appId IS NOT NULL`,
);

// Soften Game.appId uniqueness ahead of prisma push if needed
try {
  db.exec(`CREATE INDEX IF NOT EXISTS Game_appId_idx ON Game(appId)`);
} catch {
  /* ignore */
}

console.log(
  "wishlist sample",
  db.prepare(`SELECT userId, store, externalId, appId FROM WishlistItem LIMIT 3`).all(),
);
db.close();
console.log("pre-migrate ok");
