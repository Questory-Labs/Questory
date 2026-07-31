import type { ScraperDefinition } from "@questorylabs/shared";
import { LETTERBOXD_SCRAPER_DEFINITION } from "./letterboxd-default-config";

export type ScraperProviderRegistryEntry = {
  key: string;
  label: string;
  description: string;
  defaultConfig: ScraperDefinition;
};

export const SCRAPER_PROVIDER_REGISTRY: Record<
  string,
  ScraperProviderRegistryEntry
> = {
  letterboxd: {
    key: "letterboxd",
    label: "Letterboxd",
    description: "Diary scrape for letterboxd.com (cheerio, date-sorted pagination).",
    defaultConfig: LETTERBOXD_SCRAPER_DEFINITION,
  },
};

export function listScraperProviderRegistry() {
  return Object.values(SCRAPER_PROVIDER_REGISTRY).map(
    ({ key, label, description }) => ({ key, label, description }),
  );
}

export function getScraperProviderRegistry(
  key: string,
): ScraperProviderRegistryEntry | null {
  return SCRAPER_PROVIDER_REGISTRY[key] ?? null;
}
