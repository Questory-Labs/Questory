import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonTileGrid, SkeletonStatGrid } from "./Skeleton";

describe("Skeleton", () => {
  it("renders tile grid with busy state", () => {
    const { container } = render(<SkeletonTileGrid count={2} />);
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("renders stat grid", () => {
    const { container } = render(<SkeletonStatGrid count={2} />);
    expect(container.querySelectorAll(".rounded-lg.border").length).toBe(2);
  });
});
