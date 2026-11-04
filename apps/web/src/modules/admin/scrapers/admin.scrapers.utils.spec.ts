import { describe, expect, it } from "vitest";
import { providerStatus } from "./admin.scrapers.utils";
import type { ScraperProviderRow } from "./admin.scrapers.types";

const row = (patch: Partial<ScraperProviderRow>): ScraperProviderRow => ({
  key: "letterboxd",
  label: "Letterboxd",
  description: null,
  enabled: true,
  hasPublished: true,
  hasOpenIteration: false,
  publishedVersion: 3,
  publishedAt: null,
  ...patch,
});

describe("providerStatus", () => {
  it("shows the live version", () => {
    expect(providerStatus(row({}))).toEqual({ label: "v3 live", tone: "ok" });
  });

  it("shows disabled providers as muted", () => {
    expect(providerStatus(row({ enabled: false }))).toEqual({
      label: "Disabled",
      tone: "muted",
    });
  });

  it("shows unpublished providers with an open iteration as draft", () => {
    expect(
      providerStatus(
        row({ hasPublished: false, hasOpenIteration: true, publishedVersion: null }),
      ),
    ).toEqual({ label: "Draft", tone: "warn" });
  });

  it("falls back when no version is reported", () => {
    expect(providerStatus(row({ publishedVersion: undefined })).label).toBe("Live");
    expect(
      providerStatus(row({ hasPublished: false, publishedVersion: null })).label,
    ).toBe("Not published");
  });
});
