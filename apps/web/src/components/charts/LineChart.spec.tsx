import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LineChart } from "./LineChart";

describe("LineChart", () => {
  afterEach(() => cleanup());

  it("does not throw when data is empty", () => {
    render(<LineChart data={[]} ariaLabel="Price history" />);

    expect(screen.getByText("Not enough activity yet.")).toBeInTheDocument();
  });

  it("does not throw for a single point", () => {
    render(
      <LineChart
        data={[{ label: "2024-01-01", value: 10 }]}
        ariaLabel="Price history"
      />,
    );

    expect(screen.getByText("Not enough activity yet.")).toBeInTheDocument();
  });

  it("renders a smooth area and stroke, not a hatch sketch", () => {
    const { container } = render(
      <LineChart
        data={[
          { label: "00:00", value: 2 },
          { label: "12:00", value: 8 },
          { label: "18:00", value: 20 },
        ]}
        ariaLabel="Hour of day"
      />,
    );
    const svg = screen.getByRole("img", { name: "Hour of day" });
    expect(svg.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    expect(container.innerHTML).not.toContain("rough");
  });

  it("sizes the svg to the layout height so labels are not stretched", () => {
    render(
      <LineChart
        data={[
          { label: "2026-01-01", value: 100 },
          { label: "2026-06-01", value: 1_200_000 },
        ]}
        ariaLabel="Players"
        size="lg"
        xMode="time"
        formatYTick={(n) =>
          n >= 10_000
            ? `${(n / 1_000_000).toFixed(1)}M`
            : n.toLocaleString()
        }
      />,
    );
    const svg = screen.getByRole("img", { name: "Players" });
    expect(svg.getAttribute("style")).toContain("height: 288px");
    expect(svg.className).not.toContain("h-64");
  });
});
