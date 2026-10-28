import type { AdminTone } from "../shared/admin.tone";
import type { ScraperProviderRow } from "./admin.scrapers.types";

export const providerStatus = (
  provider: ScraperProviderRow,
): { label: string; tone: AdminTone } => {
  if (!provider.enabled) return { label: "Disabled", tone: "muted" };
  if (provider.hasPublished) {
    return {
      label:
        provider.publishedVersion != null
          ? `v${provider.publishedVersion} live`
          : "Live",
      tone: "ok",
    };
  }
  if (provider.hasOpenIteration) return { label: "Draft", tone: "warn" };
  return { label: "Not published", tone: "muted" };
};
