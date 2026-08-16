import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CHART_TOOLTIP_GAP_PX } from "@/lib/charts";
import { ChartTooltip } from "./ChartTooltip";

describe("ChartTooltip", () => {
  afterEach(() => cleanup());

  it("anchors to the given cell point instead of the chart center", () => {
    render(
      <ChartTooltip x={90} y={40}>
        <div>Sat 3am</div>
        <div>53 listens</div>
      </ChartTooltip>,
    );

    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveStyle({
      left: "90px",
      top: `${40 - CHART_TOOLTIP_GAP_PX}px`,
    });
    expect(tip.className).not.toMatch(/left-1\/2/);
  });
});
