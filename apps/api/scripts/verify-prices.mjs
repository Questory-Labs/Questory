import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(resolve(__dirname, "../../../.env"), "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  if (!process.env[line.slice(0, i).trim()]) {
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query(
  `SELECT "appId", name, "currentPrice", "priceCurrency"
   FROM "Game" WHERE "appId" = ANY($1::int[]) ORDER BY "appId"`,
  [[268910, 275850, 1808500, 3164500]],
);
console.table(r.rows);
await c.end();
