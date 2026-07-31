import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(resolve(__dirname, "../../../.env"), "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const key = line.slice(0, i).trim();
  if (!process.env[key]) process.env[key] = line.slice(i + 1).trim();
}

const SUSPICIOUS_CEILING = 15_000;

async function steamMajorPrice(appId, countryCode) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${encodeURIComponent(countryCode || "IN")}`,
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

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: games } = await client.query(`
  SELECT DISTINCT g.id AS "gameId", g."appId", u."countryCode"
  FROM "Game" g
  JOIN "LibraryEntry" le ON le."gameId" = g.id
  JOIN "User" u ON u.id = le."userId"
  WHERE le.hidden = false
    AND g."appId" IS NOT NULL
    AND (
      g."currentPrice" IS NULL
      OR g."currentPrice" > $1
      OR g."priceCurrency" IS NULL
      OR g."priceCurrency" NOT IN ('INR', 'USD', 'EUR', 'GBP')
    )
`, [SUSPICIOUS_CEILING]);

let updated = 0;
for (const game of games) {
  const country = game.countryCode || "IN";
  const price = await steamMajorPrice(game.appId, country);
  if (!price) continue;

  await client.query(
    `UPDATE "Game"
     SET "currentPrice" = $1, "lowestPrice" = $2,
         "priceCurrency" = COALESCE($3, "priceCurrency"),
         "priceSyncedAt" = NOW()
     WHERE id = $4`,
    [price.current, price.lowest, price.currency, game.gameId],
  );
  await client.query(
    `UPDATE "GameStoreListing"
     SET "currentPrice" = $1, "lowestPrice" = $2,
         "priceCurrency" = COALESCE($3, "priceCurrency"),
         "priceSyncedAt" = NOW()
     WHERE store = 'steam' AND "externalId" = $4`,
    [price.current, price.lowest, price.currency, String(game.appId)],
  );
  updated += 1;
  console.log(`Fixed app ${game.appId}: ${price.current} ${price.currency}`);
  await new Promise((r) => setTimeout(r, 350));
}

console.log(`Repaired ${updated} suspicious games`);
await client.end();
