import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CURRENT_YEAR } from "../media.rewind.constants";
import { RewindHeader } from "./RewindHeader";

const renderHeader = (patch: Partial<Parameters<typeof RewindHeader>[0]> = {}) =>
  render(
    <RewindHeader
      eyebrow="Your top insights for March 2025"
      titleLead="Games"
      accentColor="var(--games)"
      year={2025}
      month={3}
      availableMonths={[1, 2, 3]}
      monthDisabled={false}
      onYearChange={() => undefined}
      onMonthChange={() => undefined}
      share={<button type="button">Share</button>}
      {...patch}
    />,
  );

describe("RewindHeader", () => {
  afterEach(cleanup);

  it("renders the title, all-year option for past years and month changes", () => {
    const onMonthChange = vi.fn();
    renderHeader({ onMonthChange });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Games Rewind");
    const month = screen.getByRole("combobox", { name: /Month/ });
    expect(screen.getByRole("option", { name: "All year" })).toBeInTheDocument();
    fireEvent.change(month, { target: { value: "all" } });
    expect(onMonthChange).toHaveBeenCalledWith("all");
    fireEvent.change(month, { target: { value: "2" } });
    expect(onMonthChange).toHaveBeenLastCalledWith(2);
  });

  it("hides all-year for the current year and disables months when none completed", () => {
    const onYearChange = vi.fn();
    renderHeader({ year: CURRENT_YEAR, availableMonths: [], month: 1, monthDisabled: true, onYearChange });
    expect(screen.queryByRole("option", { name: "All year" })).toBeNull();
    expect(screen.getByRole("combobox", { name: /Month/ })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: /Year/ }), { target: { value: "2024" } });
    expect(onYearChange).toHaveBeenCalledWith(2024);
  });
});
