import { describe, expect, it, afterEach } from "vitest";
import {
  isApiSecretRequired,
  isWebhookSecretRequired,
  allowsSoleUserFallback,
} from "../../src/lib/runtime-config";

describe("watch mode matrix", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("disables sole-user fallback outside local/selfhosted", () => {
    process.env.APP_MODE = "production";
    expect(allowsSoleUserFallback()).toBe(false);
    process.env.APP_MODE = "local";
    expect(allowsSoleUserFallback()).toBe(true);
  });

  it("requires webhook secret outside local", () => {
    process.env.APP_MODE = "selfhosted";
    expect(isWebhookSecretRequired()).toBe(true);
    process.env.APP_MODE = "local";
    expect(isWebhookSecretRequired()).toBe(false);
  });

  it("requires API secret outside local", () => {
    process.env.APP_MODE = "selfhosted";
    delete process.env.WATCH_API_SECRET;
    expect(isApiSecretRequired()).toBe(true);
    process.env.APP_MODE = "local";
    expect(isApiSecretRequired()).toBe(false);
  });
});
