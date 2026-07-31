import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";
import { normalizeMajorPrice } from "../lib/store-price";
import { ITAD_SHOP_IDS, StoreId } from "../stores/store.constants";

const CHUNK = 150;
const LOOKUP_CHUNK = 200;
const MAX_429_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 5_000;
const MAX_RETRY_AFTER_MS = 300_000;

export type ItadPriceHistoryPoint = {
  date: string;
  price: number;
};

export type ItadPrice = {
  current: number | null;
  lowest: number | null;
  currency?: string | null;
};

type ItadMoney = {
  amount?: number;
  amountInt?: number;
  currency?: string;
};

@Injectable()
export class ItadService {
  private readonly logger = new Logger(ItadService.name);
  private readonly apiKey = process.env.ITAD_API_KEY || "";
  /** Shared cooldown so concurrent callers honor the same 429 window. */
  private rateLimitedUntil = 0;

  constructor(private readonly cache: CacheService) {}

  async getSteamPrices(
    appIds: number[],
    countryCode = "US",
  ): Promise<Record<number, ItadPrice>> {
    const unique = [
      ...new Set(appIds.filter((id) => Number.isFinite(id) && id > 0)),
    ];
    const result: Record<number, ItadPrice> = {};
    for (const id of unique) result[id] = { current: null, lowest: null };
    if (!this.apiKey || !unique.length) return result;

    const byKey = await this.getPricesForStore(
      "steam",
      unique.map(String),
      countryCode,
    );
    for (const id of unique) {
      result[id] = byKey[String(id)] || { current: null, lowest: null };
    }
    return result;
  }

  /** Prices keyed by store externalId. */
  async getPricesForStore(
    store: StoreId,
    externalIds: string[],
    countryCode = "US",
  ): Promise<Record<string, ItadPrice>> {
    const unique = [...new Set(externalIds.filter(Boolean))];
    const result: Record<string, ItadPrice> = {};
    for (const id of unique) result[id] = { current: null, lowest: null };
    if (!this.apiKey || !unique.length) return result;

    const country = (countryCode || "US").trim().toUpperCase() || "US";
    const shopId = ITAD_SHOP_IDS[store];
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      Object.assign(
        result,
        await this.fetchOverviewChunk(store, shopId, chunk, result, country),
      );
    }
    return result;
  }

  async lookupSteamApp(appId: number): Promise<string | null> {
    return this.lookupByShop("steam", String(appId));
  }

  /** Resolve ITAD game UUID from a shop listing id. */
  async lookupByShop(
    store: StoreId,
    externalId: string,
  ): Promise<string | null> {
    if (!this.apiKey || !externalId) return null;
    const map = await this.resolveItadIds(store, [externalId]);
    return map.get(externalId) ?? null;
  }

  async getPriceHistory(
    store: StoreId,
    externalId: string,
    countryCode = "US",
  ): Promise<{
    history: ItadPriceHistoryPoint[];
    historicalLow: number | null;
    historicalHigh: number | null;
  }> {
    const empty = {
      history: [] as ItadPriceHistoryPoint[],
      historicalLow: null as number | null,
      historicalHigh: null as number | null,
    };
    if (!this.apiKey) return empty;

    const country = (countryCode || "US").trim().toUpperCase() || "US";
    const cacheKey = `itad:history:v2:${store}:${country}:${externalId}`;
    const cached = await this.cache.getJson<typeof empty>(cacheKey);
    if (cached) return cached;

    const itadId = await this.lookupByShop(store, externalId);
    if (!itadId) return empty;

    try {
      const url = `https://api.isthereanydeal.com/games/history/v2?key=${this.apiKey}&id=${encodeURIComponent(itadId)}&country=${encodeURIComponent(country)}`;
      const res = await this.fetchItad(url);
      if (!res.ok) {
        this.logger.warn(
          `ITAD history failed for ${store}/${externalId}: ${res.status}`,
        );
        return empty;
      }
      const data = (await res.json()) as Array<{
        timestamp?: string;
        shop?: { id?: number; name?: string };
        deal?: { price?: { amount?: number } };
        price?: { amount?: number };
      }>;

      const shopId = ITAD_SHOP_IDS[store];
      const shopName = store === "steam" ? /steam/i : store === "gog" ? /gog/i : /epic/i;
      const points = (Array.isArray(data) ? data : [])
        .filter(
          (row) =>
            row.shop?.id === shopId || shopName.test(row.shop?.name || ""),
        )
        .map((row) => {
          const price = row.deal?.price?.amount ?? row.price?.amount ?? null;
          const date = row.timestamp;
          if (price == null || !date) return null;
          return { date, price };
        })
        .filter((p): p is ItadPriceHistoryPoint => p != null)
        .sort((a, b) => a.date.localeCompare(b.date));

      const history =
        points.length > 120 ? this.downsampleHistory(points, 120) : points;
      const prices = points.map((p) => p.price);
      const result = {
        history,
        historicalLow: prices.length ? Math.min(...prices) : null,
        historicalHigh: prices.length ? Math.max(...prices) : null,
      };
      await this.cache.setJson(cacheKey, result, 21600);
      return result;
    } catch (err) {
      this.logger.warn(`ITAD history error for ${store}/${externalId}: ${err}`);
      return empty;
    }
  }

  async getSteamPriceHistory(
    appId: number,
    countryCode = "US",
  ): Promise<{
    history: ItadPriceHistoryPoint[];
    historicalLow: number | null;
    historicalHigh: number | null;
  }> {
    return this.getPriceHistory("steam", String(appId), countryCode);
  }

  private shopLookupBodyId(store: StoreId, externalId: string): string {
    if (store === "steam") return `app/${externalId}`;
    return externalId;
  }

  private parseItadPrice(price?: ItadMoney | null): {
    amount: number | null;
    currency: string | null;
  } {
    if (!price) return { amount: null, currency: null };
    return {
      amount: normalizeMajorPrice(price.amount, price.amountInt),
      currency: price.currency?.trim().toUpperCase() || null,
    };
  }

  /** Batch-resolve shop listing ids to ITAD game UUIDs. */
  private async resolveItadIds(
    store: StoreId,
    externalIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!this.apiKey || !externalIds.length) return map;

    const missing: string[] = [];
    for (const extId of externalIds) {
      const cacheKey = `itad:lookup:shop:${store}:${extId}`;
      const cached = await this.cache.getJson<{ id: string | null }>(cacheKey);
      if (cached?.id) {
        map.set(extId, cached.id);
      } else if (!cached) {
        missing.push(extId);
      }
    }

    if (!missing.length) return map;

    const shopId = ITAD_SHOP_IDS[store];
    for (let i = 0; i < missing.length; i += LOOKUP_CHUNK) {
      const chunk = missing.slice(i, i + LOOKUP_CHUNK);
      const bodyIds = chunk.map((id) => this.shopLookupBodyId(store, id));

      try {
        const url = `https://api.isthereanydeal.com/lookup/id/shop/${shopId}/v1?key=${this.apiKey}`;
        const res = await this.fetchItad(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyIds),
        });
        if (!res.ok) {
          this.logger.warn(
            `ITAD batch shop lookup failed (${store}): ${res.status}`,
          );
          continue;
        }
        const data = (await res.json()) as Record<string, string | null>;
        for (const extId of chunk) {
          const key = this.shopLookupBodyId(store, extId);
          const id = data[key] ?? null;
          const cacheKey = `itad:lookup:shop:${store}:${extId}`;
          await this.cache.setJson(cacheKey, { id }, id ? 86400 : 3600);
          if (id) map.set(extId, id);
        }
      } catch (err) {
        this.logger.warn(`ITAD batch lookup error (${store}): ${err}`);
      }
    }

    return map;
  }

  private async fetchOverviewChunk(
    store: StoreId,
    shopId: number,
    externalIds: string[],
    fallback: Record<string, ItadPrice>,
    country: string,
  ) {
    const result = { ...fallback };
    try {
      const idMap = await this.resolveItadIds(store, externalIds);
      const uuidToExt = new Map<string, string>();
      for (const [extId, uuid] of idMap.entries()) {
        uuidToExt.set(uuid, extId);
      }
      const uuids = [...idMap.values()];
      if (!uuids.length) return result;

      const sortedKey = [...uuids].sort().join(",");
      const cacheKey = `itad:prices:v5:${store}:${country}:${sortedKey}`;
      const cached = await this.cache.getJson<typeof result>(cacheKey);
      if (cached) return cached;

      const url = `https://api.isthereanydeal.com/games/overview/v2?key=${this.apiKey}&country=${encodeURIComponent(country)}&shops=${shopId}`;
      const res = await this.fetchItad(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uuids),
      });
      if (!res.ok) {
        this.logger.warn(`ITAD overview failed (${store}): ${res.status}`);
        return result;
      }
      const data = (await res.json()) as {
        prices?: {
          id?: string;
          current?: { price?: ItadMoney };
          lowest?: { price?: ItadMoney };
        }[];
      };
      for (const row of data.prices || []) {
        const extId = row.id ? uuidToExt.get(row.id) : null;
        if (!extId) continue;
        const currentParsed = this.parseItadPrice(row.current?.price);
        const lowestParsed = this.parseItadPrice(row.lowest?.price);
        result[extId] = {
          current: currentParsed.amount,
          lowest: lowestParsed.amount,
          currency: currentParsed.currency ?? lowestParsed.currency ?? null,
        };
      }
      await this.cache.setJson(cacheKey, result, 1800);
      return result;
    } catch (err) {
      this.logger.warn(`ITAD error (${store}): ${err}`);
      return result;
    }
  }

  /**
   * Fetch with shared 429 cooldown + Retry-After retries.
   * ITAD docs: 429 includes Retry-After; hammering extends the window.
   */
  private async fetchItad(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
      await this.waitForRateLimit();
      const res = await fetch(url, init);
      if (res.status !== 429) return res;

      const delayMs = this.parseRetryAfterMs(res);
      this.rateLimitedUntil = Math.max(
        this.rateLimitedUntil,
        Date.now() + delayMs,
      );
      this.logger.warn(
        `ITAD 429; backing off ${Math.ceil(delayMs / 1000)}s` +
          (attempt < MAX_429_RETRIES
            ? ` (retry ${attempt + 1}/${MAX_429_RETRIES})`
            : " (giving up)"),
      );
      if (attempt >= MAX_429_RETRIES) return res;
    }
    return new Response(null, { status: 429 });
  }

  private async waitForRateLimit() {
    const wait = this.rateLimitedUntil - Date.now();
    if (wait > 0) await this.sleep(wait);
  }

  private parseRetryAfterMs(res: Response): number {
    const header = res.headers.get("retry-after");
    if (!header) return DEFAULT_RETRY_AFTER_MS;

    const asSeconds = Number(header);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(asSeconds * 1000, MAX_RETRY_AFTER_MS);
    }

    const asDate = Date.parse(header);
    if (Number.isFinite(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), MAX_RETRY_AFTER_MS);
    }

    return DEFAULT_RETRY_AFTER_MS;
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private downsampleHistory(
    points: ItadPriceHistoryPoint[],
    max: number,
  ): ItadPriceHistoryPoint[] {
    if (points.length <= max) return points;
    const step = Math.ceil(points.length / max);
    const out: ItadPriceHistoryPoint[] = [];
    for (let i = 0; i < points.length; i += step) {
      const chunk = points.slice(i, i + step);
      const lowest = chunk.reduce((best, p) => (p.price < best.price ? p : best));
      out.push(lowest);
    }
    const last = points[points.length - 1];
    if (out[out.length - 1]?.date !== last.date) out.push(last);
    return out;
  }
}
