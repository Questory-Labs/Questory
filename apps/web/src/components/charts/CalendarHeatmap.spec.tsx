import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CALENDAR_MONTH_GAP_CLASS,
  CHART_TOOLTIP_GAP_PX,
} from "@/lib/charts";
import { CalendarHeatmap } from "./CalendarHeatmap";
import { shortDate } from "./chart-utils";

describe("CalendarHeatmap", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an empty state when there are no days", () => {
    render(<CalendarHeatmap days={[]} />);
    expect(screen.getByText("No listening in this range.")).toBeInTheDocument();
  });

  it("fills a gap day between sparse values", () => {
    render(
      <CalendarHeatmap
        days={[
          { date: "2026-03-10", value: 5 },
          { date: "2026-03-12", value: 2 },
        ]}
      />,
    );

    expect(screen.getByLabelText("2026-03-10: 5 listens")).toBeInTheDocument();
    expect(screen.getByLabelText("2026-03-11: 0 listens")).toBeInTheDocument();
    expect(screen.getByLabelText("2026-03-12: 2 listens")).toBeInTheDocument();

    const chart = screen.getByLabelText("Listening calendar");
    expect(chart.className).toMatch(/\bw-full\b/);
    expect(screen.getByLabelText("2026-03-10: 5 listens").className).toMatch(
      /\bw-full\b/,
    );
  });

  it("anchors the hover tooltip to the day cell instead of the chart center", () => {
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
        if (this.getAttribute("aria-label") === "2026-03-10: 5 listens") {
          return rect(24, 32, 12, 12);
        }
        return rect(0, 0, 400, 80);
      },
    );

    render(
      <CalendarHeatmap
        days={[
          { date: "2026-03-10", value: 5 },
          { date: "2026-03-12", value: 2 },
        ]}
      />,
    );

    fireEvent.mouseEnter(screen.getByLabelText("2026-03-10: 5 listens"));

    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent(shortDate("2026-03-10"));
    expect(tip).toHaveTextContent("5 listens");
    expect(tip).toHaveStyle({
      left: "30px",
      top: `${32 - CHART_TOOLTIP_GAP_PX}px`,
    });
    expect(tip.className).not.toMatch(/left-1\/2/);
  });

  it("adds a wider gap before the first week of a new month", () => {
    render(
      <CalendarHeatmap
        days={[
          { date: "2026-03-10", value: 1 },
          { date: "2026-04-15", value: 1 },
        ]}
      />,
    );

    const mar = screen.getByText("Mar").parentElement;
    const apr = screen.getByText("Apr").parentElement;
    expect(mar?.getAttribute("data-month-start")).toBe("true");
    expect(apr?.getAttribute("data-month-start")).toBe("true");
    expect(mar?.className).not.toMatch(
      new RegExp(`\\b${CALENDAR_MONTH_GAP_CLASS}\\b`),
    );
    expect(apr?.className).toMatch(
      new RegExp(`\\b${CALENDAR_MONTH_GAP_CLASS}\\b`),
    );
  });
});
