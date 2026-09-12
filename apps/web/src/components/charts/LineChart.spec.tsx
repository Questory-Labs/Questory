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
});
