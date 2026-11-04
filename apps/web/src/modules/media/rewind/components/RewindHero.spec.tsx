import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RewindHero } from "./RewindHero";

describe("RewindHero", () => {
  afterEach(cleanup);

  it("renders the label, note and one bar per bucket", () => {
    const { container } = render(
      <RewindHero
        color="var(--games)"
        hero={{
          label: "Hours played",
          value: 46,
          decimals: 0,
          unit: "h",
          note: "18 games",
          daily: true,
          peak: "Peak Sep 6",
          bars: [
            { key: "2026-09-05", label: "Sep 5", value: 1, weekend: false },
            { key: "2026-09-06", label: "Sep 6", value: 3, weekend: true },
            { key: "2026-09-07", label: "Sep 7", value: 0, weekend: true },
          ],
        }}
      />,
    );
    expect(screen.getByText("Hours played")).toBeInTheDocument();
    expect(screen.getByText("18 games")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Day by day activity, weekends highlighted\. Peak Sep 6/ })).toBeInTheDocument();
    expect(container.querySelectorAll("[role=img] > span")).toHaveLength(3);
  });

  it("omits the chart without activity", () => {
    render(
      <RewindHero
        color="var(--ink)"
        hero={{ label: "Time across everything", value: 0, decimals: 0, unit: "h", note: "No activity in this period yet.", daily: false, peak: null, bars: [] }}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});
