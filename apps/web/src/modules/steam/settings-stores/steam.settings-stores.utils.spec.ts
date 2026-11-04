import { describe, expect, it } from "vitest";
import { maskSteamId } from "./steam.settings-stores.utils";

describe("maskSteamId", () => {
  it("keeps the first and last four digits", () => {
    expect(maskSteamId("76561198000001234")).toBe("7656••••••••1234");
  });

  it("returns short ids unchanged and null for missing ids", () => {
    expect(maskSteamId("12345678")).toBe("12345678");
    expect(maskSteamId(null)).toBeNull();
    expect(maskSteamId(undefined)).toBeNull();
    expect(maskSteamId("")).toBeNull();
  });
});
