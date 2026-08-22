import { describe, expect, it } from "vitest";
import { displayLabel } from "./display-label";

describe("displayLabel", () => {
  it("uses a trimmed display name when set", () => {
    expect(displayLabel("  Nobody  ", "Nobody 2")).toBe("Nobody");
  });

  it("falls back to the canonical name", () => {
    expect(displayLabel(null, "Nobody 2")).toBe("Nobody 2");
    expect(displayLabel("   ", "Nobody 2")).toBe("Nobody 2");
  });
});
