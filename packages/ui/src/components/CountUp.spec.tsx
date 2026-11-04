import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountUp } from "./CountUp";

describe("CountUp", () => {
  it("exposes the final value to assistive tech and dims decimals", () => {
    const { container } = render(
      <CountUp value={21.6} decimals={1} dimDecimals suffix=" h" />,
    );
    expect(screen.getByText("21.6 h")).toHaveClass("sr-only");
    expect(container.querySelector(".num-dim")).toHaveTextContent(".6");
  });

  it("formats thousands without decimals", () => {
    const { container } = render(<CountUp value={2481} />);
    expect(container.querySelector(".sr-only")).toHaveTextContent("2,481");
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("2,481");
  });
});
