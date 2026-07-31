import { describe, expect, it } from "vitest";
import {
  isSuspiciousPrice,
  normalizeMajorPrice,
} from "../../src/lib/store-price";

describe("normalizeMajorPrice", () => {
  it("returns amount when already in major units", () => {
    expect(normalizeMajorPrice(565, 56500)).toBe(565);
    expect(normalizeMajorPrice(19.99, 1999)).toBe(19.99);
  });

  it("divides when amount equals amountInt (minor units leaked)", () => {
    expect(normalizeMajorPrice(56500, 56500)).toBe(565);
    expect(normalizeMajorPrice(240000, 240000)).toBe(2400);
  });

  it("heals large whole multiples of 100", () => {
    expect(normalizeMajorPrice(56500)).toBe(565);
  });
});

describe("isSuspiciousPrice", () => {
  it("flags prices far from Steam reference", () => {
    expect(isSuspiciousPrice(40_000, "INR", 565)).toBe(true);
    expect(isSuspiciousPrice(565, "INR", 565)).toBe(false);
  });

  it("flags very high INR without Steam reference", () => {
    expect(isSuspiciousPrice(40_000, "INR", null)).toBe(true);
    expect(isSuspiciousPrice(2_400, "INR", null)).toBe(false);
  });
});
