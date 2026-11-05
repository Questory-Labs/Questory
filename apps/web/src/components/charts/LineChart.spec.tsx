import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("renders a single straight stroke with peak dots and no area fill", () => {
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
    const paths = svg.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute("d")).toMatch(/^M[^C]*L[^C]*$/);
    expect(paths[0].getAttribute("fill")).toBe("none");
    expect(svg.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelector("linearGradient")).toBeNull();
  });

  it("shows a tooltip for the hovered point and clears it on leave", () => {
    const { container } = render(
      <LineChart
        data={[
          { label: "a", value: 2 },
          { label: "b", value: 8 },
        ]}
        ariaLabel="Hours"
        valueLabel="listens"
        formatXLabel={(l) => l}
      />,
    );
    const svg = screen.getByRole("img", { name: "Hours" });
    fireEvent.mouseEnter(container.querySelectorAll("rect")[1]);
    expect(screen.getByRole("tooltip")).toHaveTextContent("b8 listens");
    fireEvent.mouseLeave(svg);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("hides the y axis and grid when showYAxis is false", () => {
    const { container } = render(
      <LineChart
        data={[
          { label: "a", value: 2 },
          { label: "b", value: 8 },
        ]}
        ariaLabel="Hours"
        formatXLabel={(l) => l}
        showYAxis={false}
      />,
    );
    expect(container.querySelectorAll("line")).toHaveLength(0);
    expect(container.querySelectorAll("text")).toHaveLength(2);
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
