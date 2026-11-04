import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DotCover } from "./DotCover";

describe("DotCover", () => {
  it("is decorative and stable for the same seed", () => {
    const a = render(<DotCover seed="game-42" />).container.firstElementChild;
    const b = render(<DotCover seed="game-42" />).container.firstElementChild;
    expect(a).toHaveAttribute("aria-hidden", "true");
    expect(a?.getAttribute("style")).toBe(b?.getAttribute("style"));
  });

  it("varies the highlight by seed", () => {
    const a = render(<DotCover seed="a" />).container.firstElementChild;
    const b = render(<DotCover seed="zz-top" />).container.firstElementChild;
    expect(a?.getAttribute("style")).not.toBe(b?.getAttribute("style"));
  });
});
