import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SpendBars } from "./SpendBars";

describe("SpendBars", () => {
  afterEach(cleanup);

  it("renders one bar per value and highlights the max", () => {
    const { container } = render(
      <SpendBars values={[1, 4, 2]} label="Cost per interval" />,
    );
    expect(screen.getByRole("img", { name: "Cost per interval" })).toBeInTheDocument();
    const bars = container.querySelectorAll("rect");
    expect(bars).toHaveLength(3);
    expect(bars[1].getAttribute("class")).toContain("fill-[var(--ink)]");
    expect(bars[0].getAttribute("fill")).toMatch(/^url\(#/);
  });

  it("keeps only the latest 24 values", () => {
    const values = Array.from({ length: 30 }, (_, i) => i + 1);
    const { container } = render(<SpendBars values={values} label="Bars" />);
    expect(container.querySelectorAll("rect")).toHaveLength(24);
  });

  it("renders nothing without positive values", () => {
    const { container } = render(<SpendBars values={[0, 0]} label="Bars" />);
    expect(container.querySelector("svg")).toBeNull();
    const empty = render(<SpendBars values={[]} label="Empty" />);
    expect(empty.container.querySelector("svg")).toBeNull();
  });
});
