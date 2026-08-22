import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartStatus } from "./ChartStatus";

describe("ChartStatus", () => {
  afterEach(cleanup);

  it("shows the error before the empty skeleton", () => {
    render(
      <ChartStatus failed empty title="Hour of day" error="Could not load.">
        <p>ready</p>
      </ChartStatus>,
    );
    expect(screen.getByText("Could not load.")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });

  it("renders children when ready", () => {
    render(
      <ChartStatus
        failed={false}
        empty={false}
        title="Hour of day"
        error="Could not load."
      >
        <p>ready</p>
      </ChartStatus>,
    );
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
