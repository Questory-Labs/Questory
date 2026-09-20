import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listProviderConnectedUrl } from "../../src/features/list-provider-redirect";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

describe("listProviderConnectedUrl", () => {
  const saved = {
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
  };

  beforeEach(() => {
    delete process.env.WEB_ORIGIN;
    delete process.env.NEXT_PUBLIC_WEB_URL;
  });

  afterEach(() => {
    if (saved.WEB_ORIGIN === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = saved.WEB_ORIGIN;
    if (saved.NEXT_PUBLIC_WEB_URL === undefined) {
      delete process.env.NEXT_PUBLIC_WEB_URL;
    } else {
      process.env.NEXT_PUBLIC_WEB_URL = saved.NEXT_PUBLIC_WEB_URL;
    }
  });

  it("sends Read-only instances to read settings", async () => {
    const flags = {
      isDomainEnabled: async (domain: string) => domain === "read",
    } as unknown as FeatureFlagsService;
    expect(await listProviderConnectedUrl(flags, "anilist")).toBe(
      "http://localhost:3000/read/settings?anilist=connected",
    );
  });

  it("keeps Watch settings when Watch is on", async () => {
    process.env.WEB_ORIGIN = "https://app.example";
    const flags = {
      isDomainEnabled: async (domain: string) => domain === "watch",
    } as unknown as FeatureFlagsService;
    expect(await listProviderConnectedUrl(flags, "mal")).toBe(
      "https://app.example/watch/settings?mal=connected",
    );
  });
});
