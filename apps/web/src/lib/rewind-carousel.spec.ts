import { describe, expect, it } from "vitest";
import {
  rewindCoverflowOffset,
  rewindCoverflowTransform,
  REWIND_CAROUSEL_SIDE_SCALE,
} from "./rewind-carousel";

describe("rewindCoverflowOffset", () => {
  it("wraps to the nearest neighbor", () => {
    expect(rewindCoverflowOffset(0, 0, 5)).toBe(0);
    expect(rewindCoverflowOffset(1, 0, 5)).toBe(1);
    expect(rewindCoverflowOffset(4, 0, 5)).toBe(-1);
    expect(rewindCoverflowOffset(0, 4, 5)).toBe(1);
  });
});

describe("rewindCoverflowTransform", () => {
  it("keeps the front card full size and untilted", () => {
    expect(rewindCoverflowTransform(0, false)).toContain("scale(1)");
    expect(rewindCoverflowTransform(0, false)).toContain("rotate(0deg)");
  });

  it("scales and tilts neighbors, and skips tilt when motion is reduced", () => {
    expect(rewindCoverflowTransform(1, false)).toContain(`scale(${REWIND_CAROUSEL_SIDE_SCALE})`);
    expect(rewindCoverflowTransform(-1, false)).toContain("rotate(-");
    expect(rewindCoverflowTransform(1, true)).toContain("rotate(0deg)");
  });
});
