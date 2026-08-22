import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverflowMarquee } from "./OverflowMarquee";

describe("OverflowMarquee", () => {
  it("renders children", () => {
    render(<OverflowMarquee>Long title</OverflowMarquee>);
    expect(screen.getAllByText("Long title").length).toBeGreaterThan(0);
  });
});
