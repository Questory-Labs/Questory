import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CHART_TOOLTIP_GAP_PX } from "@/lib/charts";
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
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

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

  it("anchors the hover tooltip to the cell instead of the chart center", () => {
    const rect = (left: number, top: number, width: number, height: number) =>
      ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON() {},
      }) as DOMRect;

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute("aria-label") === "Fri 10pm: 12 listens") {
          return rect(80, 40, 20, 14);
        }
        return rect(0, 0, 640, 120);
      },
    );

    render(
      <HeatmapChart
        cells={[{ day: 4, hour: 22, value: 12 }]}
        dayLabels={dayLabels}
        hourLabels={hourLabels}
        maxValue={12}
      />,
    );

    fireEvent.mouseEnter(screen.getByLabelText("Fri 10pm: 12 listens"));

    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Fri 10pm");
    expect(tip).toHaveTextContent("12 listens");
    expect(tip).toHaveStyle({
      left: "90px",
      top: `${40 - CHART_TOOLTIP_GAP_PX}px`,
    });
    expect(tip.className).not.toMatch(/left-1\/2/);

    fireEvent.scroll(document.querySelector(".overflow-x-auto")!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
