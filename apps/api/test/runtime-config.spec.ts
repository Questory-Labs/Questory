import { Logger } from "@nestjs/common";
import { describe, expect, it, afterEach, vi } from "vitest";
import { assertModeConfig, resolveAllowedOrigins } from "../src/lib/runtime-config";

describe("resolveAllowedOrigins", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("includes WEB_ORIGIN by default", () => {
    process.env.WEB_ORIGIN = "https://app.example.com";
    delete process.env.FE_CORS_ALLOWED;
    expect(resolveAllowedOrigins()).toEqual(["https://app.example.com"]);
  });

  it("falls back to localhost when WEB_ORIGIN is unset", () => {
    delete process.env.WEB_ORIGIN;
    delete process.env.FE_CORS_ALLOWED;
    expect(resolveAllowedOrigins()).toEqual(["http://localhost:3000"]);
  });

  it("adds comma-separated FE_CORS_ALLOWED origins and dedupes", () => {
    process.env.WEB_ORIGIN = "https://app.example.com";
    process.env.FE_CORS_ALLOWED =
      "http://localhost:3000, https://app.example.com/,https://b.example.com/path";
    expect(resolveAllowedOrigins()).toEqual([
      "https://app.example.com",
      "http://localhost:3000",
      "https://b.example.com",
    ]);
  });

  it("drops invalid entries", () => {
    process.env.WEB_ORIGIN = "https://app.example.com";
    process.env.FE_CORS_ALLOWED = "*,not a url,,http://localhost:3000";
    expect(resolveAllowedOrigins()).toEqual([
      "https://app.example.com",
      "http://localhost:3000",
    ]);
  });

  it("rejects schemeless and non-http origins instead of allowing null", () => {
    process.env.WEB_ORIGIN = "https://app.example.com";
    process.env.FE_CORS_ALLOWED =
      "localhost:3001,app.example.com:3000,ftp://files.example.com,null,https://ok.example.com";
    expect(resolveAllowedOrigins()).toEqual([
      "https://app.example.com",
      "https://ok.example.com",
    ]);
  });

  it("warns once per invalid origin and stays quiet on blanks", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    process.env.WEB_ORIGIN = "https://app.example.com";
    process.env.FE_CORS_ALLOWED = "once.example.com:3000,, ";
    resolveAllowedOrigins();
    resolveAllowedOrigins();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("once.example.com:3000");
    warn.mockRestore();
  });
});

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
