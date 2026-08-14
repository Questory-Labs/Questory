import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HeatmapChart } from "./HeatmapChart";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourLabels = [
  "12am",
  "1am",
  "2am",
  "3am",
  "4am",
  "5am",
  "6am",
  "7am",
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
];

describe("HeatmapChart", () => {
  afterEach(() => cleanup());

  it("shows an empty state when maxValue is 0", () => {
    render(
      <HeatmapChart
        cells={[{ day: 0, hour: 0, value: 0 }]}
        dayLabels={dayLabels}
        hourLabels={hourLabels}
        maxValue={0}
      />,
    );

    expect(screen.getByText("No listening in this range.")).toBeInTheDocument();
  });

  it("renders a known cell with an accessible label", () => {
    render(
      <HeatmapChart
        cells={[{ day: 4, hour: 22, value: 12 }]}
        dayLabels={dayLabels}
        hourLabels={hourLabels}
        maxValue={12}
        ariaLabel="Listening by day and hour"
      />,
    );

    expect(
      screen.getByLabelText("Listening by day and hour"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Fri 10pm: 12 listens")).toBeInTheDocument();
  });
});
