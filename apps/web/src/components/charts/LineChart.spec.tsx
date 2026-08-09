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
});
