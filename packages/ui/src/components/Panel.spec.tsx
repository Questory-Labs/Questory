import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel, panelFaceVariants } from "./Panel";

describe("Panel", () => {
  it("renders children on a hatch panel face", () => {
    const { container } = render(<Panel>Stats</Panel>);
    expect(container.querySelector(".panel")).toBeTruthy();
    expect(container.querySelector(".hatch-shadow")).toBeTruthy();
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("renders an outline surface without a hatch cast", () => {
    const { container } = render(<Panel variant="outline">Filters</Panel>);
    expect(container.querySelector(".panel-outline")).toBeTruthy();
    expect(container.querySelector(".hatch-shadow")).toBeNull();
    expect(panelFaceVariants({ variant: "accent" })).toBe("panel-accent");
  });
});
