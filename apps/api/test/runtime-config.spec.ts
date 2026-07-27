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
});
