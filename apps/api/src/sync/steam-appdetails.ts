import type { StoreAppDetails } from "../steam/steam-api.service";

const PLATFORM_KEYS = ["windows", "mac", "linux"] as const;

export function steamPlatforms(platforms: StoreAppDetails["platforms"]): string[] {
  if (!platforms) return [];
  return PLATFORM_KEYS.filter((p) => platforms[p] === true);
}

export function steamPriceFacts(details: StoreAppDetails | null | undefined) {
  const overview = details?.price_overview;
  if (!overview) return { discountPercent: null, regularPrice: null };
  return {
    discountPercent:
      typeof overview.discount_percent === "number" ? overview.discount_percent : null,
    regularPrice:
      typeof overview.initial === "number" && overview.initial > 0
        ? overview.initial / 100
        : null,
  };
}
