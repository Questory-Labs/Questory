import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HatchShadow } from "./HatchShadow";

describe("HatchShadow", () => {
  it("renders the cast slab behind the face", () => {
    const { container } = render(
      <HatchShadow size="sm">
        <p>Face</p>
      </HatchShadow>,
    );
    expect(container.querySelector(".hatch-shadow--sm")).toBeTruthy();
    expect(container.querySelector(".hatch-cast")).toBeTruthy();
    expect(screen.getByText("Face")).toBeInTheDocument();
  });
});
