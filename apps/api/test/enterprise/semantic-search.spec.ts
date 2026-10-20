import { describe, expect, it } from "vitest";
import { parseSemanticSearch } from "../../src/enterprise/enterprise-recommendations.controller";

describe("parseSemanticSearch", () => {
  it("trims and defaults", () => {
    expect(parseSemanticSearch({ q: "  cozy co-op  " })).toEqual({
      q: "cozy co-op",
      domains: [],
      limit: 20,
    });
    expect(parseSemanticSearch({ q: "x", domains: ["games", "read"], limit: 5 })).toEqual({
      q: "x",
      domains: ["games", "read"],
      limit: 5,
    });
  });

  it("rejects empty, oversized and malformed input", () => {
    expect(() => parseSemanticSearch({})).toThrow("q is required");
    expect(() => parseSemanticSearch({ q: "a".repeat(201) })).toThrow("at most 200");
    expect(() => parseSemanticSearch({ q: "x", domains: ["sleep"] })).toThrow("domains");
    expect(() => parseSemanticSearch({ q: "x", domains: "games" })).toThrow("domains");
    expect(() => parseSemanticSearch({ q: "x", limit: 41 })).toThrow("limit");
    expect(() => parseSemanticSearch({ q: "x", limit: "5" })).toThrow("limit");
  });
});
