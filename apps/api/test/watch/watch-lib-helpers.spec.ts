import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashToken, safeEqual } from "../../src/watch/lib/tokens";
import {
  questoryUserAgent,
  shikimoriUserAgent,
} from "../../src/watch/lib/provider-user-agent";

describe("hashToken", () => {
  it("returns the sha256 hex digest", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes unicode as utf8", () => {
    expect(hashToken("tökén")).toBe(
      createHash("sha256").update(Buffer.from("tökén", "utf8")).digest("hex"),
    );
  });

  it("does not trim or normalize its input", () => {
    expect(hashToken("abc ")).not.toBe(hashToken("abc"));
    expect(hashToken("ABC")).not.toBe(hashToken("abc"));
  });

  it("handles the empty string", () => {
    expect(hashToken("")).toHaveLength(64);
  });
});

describe("safeEqual", () => {
  it("is true for identical strings", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
  });

  it("is false for different strings of equal length", () => {
    expect(safeEqual("secret", "secreT")).toBe(false);
  });

  it("is false for different lengths without throwing", () => {
    expect(safeEqual("short", "a-much-longer-value")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("does not treat a raw value as equal to its own hash", () => {
    expect(safeEqual("secret", hashToken("secret"))).toBe(false);
  });
});

describe("provider user agents", () => {
  it("identifies Questory with its project URL", () => {
    expect(questoryUserAgent()).toBe(
      "Questory/1.0 (https://github.com/Questory-Labs/Questory)",
    );
  });

  it("uses the configured Shikimori app name, trimmed", () => {
    expect(shikimoriUserAgent("  MyApp ")).toBe(
      "MyApp (https://github.com/Questory-Labs/Questory)",
    );
  });

  it.each([undefined, ""])("defaults a missing Shikimori app name (%j)", (name) => {
    expect(shikimoriUserAgent(name)).toBe(
      "Questory (https://github.com/Questory-Labs/Questory)",
    );
  });
});
