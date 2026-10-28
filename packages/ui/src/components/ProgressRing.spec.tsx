import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("labels the ring and clamps the arc to the value", () => {
    const { container } = render(
      <ProgressRing value={1.4} label="Achievements 100%">
        <span>100%</span>
      </ProgressRing>,
    );
    expect(screen.getByRole("img", { name: "Achievements 100%" })).toBeInTheDocument();
    const arc = container.querySelectorAll("circle")[1];
    expect(arc.getAttribute("stroke-dasharray")).toBe("1.0000 1");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
