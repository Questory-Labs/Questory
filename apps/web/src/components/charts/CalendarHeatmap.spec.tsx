import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CalendarHeatmap } from "./CalendarHeatmap";

describe("CalendarHeatmap", () => {
  afterEach(() => cleanup());

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
  });
});
