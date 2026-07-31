/**
 * Standalone price repair: Steam store prices for all library games (cc from user profile).
 * Usage: node apps/api/scripts/refresh-library-prices.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../../.env");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const key = line.slice(0, i).trim();
  const val = line.slice(i + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function steamMajorPrice(appId, countryCode) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${encodeURIComponent(countryCode || "US")}`,
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim().startsWith("{")) return null;
    const data = JSON.parse(text);
    const entry = data[String(appId)]?.data;
    if (!entry || entry.is_free) return { current: 0, lowest: 0, currency: null };
    const p = entry.price_overview;
    if (!p?.final) return null;
    const major = p.final / 100;
    return { current: major, lowest: major, currency: p.currency || null };
  } catch {
    return null;
  }
}

const { rows: entries } = await client.query(`
  SELECT le."gameId", g."appId", u."countryCode"
  FROM "LibraryEntry" le
  JOIN "Game" g ON g.id = le."gameId"
  JOIN "User" u ON u.id = le."userId"
  WHERE le.hidden = false AND g."appId" IS NOT NULL
`);

let updated = 0;
const seen = new Set();

for (const entry of entries) {
  const key = `${entry.appId}:${entry.countryCode || "US"}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const country = entry.countryCode || "US";
  const price = await steamMajorPrice(entry.appId, country);
  if (!price) continue;

  await client.query(
    `UPDATE "Game"
     SET "currentPrice" = $1, "lowestPrice" = $2,
         "priceCurrency" = COALESCE($3, "priceCurrency"),
         "priceSyncedAt" = NOW()
     WHERE id = $4`,
    [price.current, price.lowest, price.currency, entry.gameId],
  );
  await client.query(
    `UPDATE "GameStoreListing"
     SET "currentPrice" = $1, "lowestPrice" = $2,
         "priceCurrency" = COALESCE($3, "priceCurrency"),
         "priceSyncedAt" = NOW()
     WHERE store = 'steam' AND "externalId" = $4`,
    [price.current, price.lowest, price.currency, String(entry.appId)],
  );
  updated += 1;
  await new Promise((r) => setTimeout(r, 220));
}

console.log(`Updated prices for ${updated} unique games`);
await client.end();
