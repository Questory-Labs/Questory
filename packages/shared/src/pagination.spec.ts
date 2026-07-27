import { describe, expect, it } from "vitest";
import {
  SteamId64Schema,
  parsePageParam,
  parsePageSizeParam,
} from "./pagination";

describe("pagination parsers", () => {
  it("accepts sane pages", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageSizeParam("50")).toBe(50);
  });

  it("rejects NaN negative and huge values", () => {
    expect(parsePageParam("nope")).toBeNull();
    expect(parsePageParam("-1")).toBeNull();
    expect(parsePageSizeParam("9999")).toBeNull();
    expect(parsePageSizeParam("0")).toBeNull();
  });

  it("validates SteamID64", () => {
    expect(SteamId64Schema.safeParse("76561198000000000").success).toBe(true);
    expect(SteamId64Schema.safeParse("'; OR 1=1").success).toBe(false);
    expect(SteamId64Schema.safeParse("123").success).toBe(false);
  });
});
