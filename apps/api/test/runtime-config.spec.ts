import { describe, expect, it, afterEach } from "vitest";
import { assertModeConfig } from "../src/lib/runtime-config";

describe("assertModeConfig", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("rejects weak SESSION_SECRET in selfhosted", () => {
    process.env.APP_MODE = "selfhosted";
    process.env.SESSION_SECRET = "dev-secret";
    process.env.STEAM_API_KEY = "x".repeat(20);
    process.env.DATABASE_URL = "file:./x.db";
    expect(() => assertModeConfig()).toThrow(/SESSION_SECRET/);
  });

  it("requires SMTP when QUESTORY_CLOUD is set", () => {
    process.env.APP_MODE = "local";
    process.env.QUESTORY_CLOUD = "true";
    delete process.env.SMTP_ENABLED;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    expect(() => assertModeConfig()).toThrow(/QUESTORY_CLOUD/);
  });
});
