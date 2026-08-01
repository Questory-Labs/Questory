import { describe, expect, it } from "vitest";
import {
  formatTaglineCompact,
  pickTagline,
  pickTaglineIndex,
  taglinePool,
  type TaglineContext,
} from "./status-taglines";

const CONTEXTS: TaglineContext[] = ["loading", "notFound", "serverError"];

describe("status-taglines", () => {
  it("every pool has well-formed entries", () => {
    for (const context of CONTEXTS) {
      const pool = taglinePool(context);
      expect(pool.length).toBeGreaterThan(0);
      for (const tagline of pool) {
        expect(tagline.lines.length).toBeGreaterThanOrEqual(1);
        expect(tagline.lines.length).toBeLessThanOrEqual(2);
        expect(tagline.lines.every((l) => l.trim().length > 0)).toBe(true);
        expect(tagline.source.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("pickTagline returns entries from the pool", () => {
    for (const context of CONTEXTS) {
      const pool = taglinePool(context);
      for (let i = 0; i < 20; i++) {
        expect(pool).toContain(pickTagline(context));
      }
    }
  });

  it("pickTaglineIndex never repeats the excluded index", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickTaglineIndex("loading", 0)).not.toBe(0);
    }
  });

  it("formats a compact one-liner with attribution", () => {
    expect(
      formatTaglineCompact({ lines: ["The cake is a lie."], source: "Portal" }),
    ).toBe("“The cake is a lie.” — Portal");
    expect(
      formatTaglineCompact({
        lines: ["I did not hit her, I did not!", "Oh! Hi Mark"],
        source: "The Room",
      }),
    ).toBe("“I did not hit her, I did not! Oh! Hi Mark” — The Room");
  });
});
