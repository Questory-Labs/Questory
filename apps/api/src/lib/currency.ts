/** Map Steam / ISO country codes to ISO 4217 currency codes. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  IN: "INR",
  GB: "GBP",
  UK: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  KR: "KRW",
  CN: "CNY",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  UY: "UYU",
  RU: "RUB",
  TR: "TRY",
  UA: "UAH",
  ZA: "ZAR",
  AE: "AED",
  SA: "SAR",
  IL: "ILS",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  TW: "TWD",
  HK: "HKD",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  CH: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "EUR",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
};

/** Regions offered in profile settings (country drives store pricing). */
export const PRICE_REGIONS: {
  countryCode: string;
  currency: string;
  label: string;
}[] = [
  { countryCode: "IN", currency: "INR", label: "India (INR)" },
  { countryCode: "US", currency: "USD", label: "United States (USD)" },
  { countryCode: "GB", currency: "GBP", label: "United Kingdom (GBP)" },
  { countryCode: "CA", currency: "CAD", label: "Canada (CAD)" },
  { countryCode: "AU", currency: "AUD", label: "Australia (AUD)" },
  { countryCode: "DE", currency: "EUR", label: "Germany (EUR)" },
  { countryCode: "FR", currency: "EUR", label: "France (EUR)" },
  { countryCode: "NL", currency: "EUR", label: "Netherlands (EUR)" },
  { countryCode: "BR", currency: "BRL", label: "Brazil (BRL)" },
  { countryCode: "JP", currency: "JPY", label: "Japan (JPY)" },
  { countryCode: "KR", currency: "KRW", label: "South Korea (KRW)" },
  { countryCode: "SG", currency: "SGD", label: "Singapore (SGD)" },
  { countryCode: "AE", currency: "AED", label: "UAE (AED)" },
  { countryCode: "TR", currency: "TRY", label: "Turkey (TRY)" },
  { countryCode: "PL", currency: "PLN", label: "Poland (PLN)" },
  { countryCode: "SE", currency: "SEK", label: "Sweden (SEK)" },
  { countryCode: "NO", currency: "NOK", label: "Norway (NOK)" },
  { countryCode: "CH", currency: "CHF", label: "Switzerland (CHF)" },
  { countryCode: "MX", currency: "MXN", label: "Mexico (MXN)" },
  { countryCode: "AR", currency: "ARS", label: "Argentina (ARS)" },
  { countryCode: "ZA", currency: "ZAR", label: "South Africa (ZAR)" },
  { countryCode: "NZ", currency: "NZD", label: "New Zealand (NZD)" },
  { countryCode: "HK", currency: "HKD", label: "Hong Kong (HKD)" },
  { countryCode: "TW", currency: "TWD", label: "Taiwan (TWD)" },
  { countryCode: "PH", currency: "PHP", label: "Philippines (PHP)" },
  { countryCode: "MY", currency: "MYR", label: "Malaysia (MYR)" },
  { countryCode: "TH", currency: "THB", label: "Thailand (THB)" },
  { countryCode: "ID", currency: "IDR", label: "Indonesia (IDR)" },
  { countryCode: "VN", currency: "VND", label: "Vietnam (VND)" },
  { countryCode: "RU", currency: "RUB", label: "Russia (RUB)" },
  { countryCode: "UA", currency: "UAH", label: "Ukraine (UAH)" },
  { countryCode: "CN", currency: "CNY", label: "China (CNY)" },
];

/** EU is a convenience picker option — Steam/ITAD use a Eurozone country. */
const REGION_ALIASES: Record<string, string> = {
  EU: "DE",
};

export function normalizePriceCountry(countryCode?: string | null): string | null {
  if (!countryCode) return null;
  const upper = countryCode.trim().toUpperCase();
  if (!upper) return null;
  return REGION_ALIASES[upper] || upper;
}

export function isSupportedPriceCountry(countryCode?: string | null): boolean {
  const normalized = normalizePriceCountry(countryCode);
  if (!normalized) return false;
  if (COUNTRY_CURRENCY[normalized]) return true;
  return PRICE_REGIONS.some((r) => r.countryCode === countryCode?.toUpperCase());
}

export function currencyFromCountry(countryCode?: string | null): string {
  const normalized = normalizePriceCountry(countryCode);
  if (!normalized) return "USD";
  return COUNTRY_CURRENCY[normalized] || "USD";
}

/**
 * Display currency for a user's prices.
 * Prefer the profile price region so a stale USD cache does not win over INR.
 */
export function resolveDisplayCurrency(opts: {
  priceCurrency?: string | null;
  purchaseCurrency?: string | null;
  countryCode?: string | null;
}): string {
  if (opts.countryCode) return currencyFromCountry(opts.countryCode);
  const explicit = opts.priceCurrency?.trim().toUpperCase();
  if (explicit) return explicit;
  const purchase = opts.purchaseCurrency?.trim().toUpperCase();
  if (purchase) return purchase;
  return "USD";
}
