import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DashboardHeader } from "./DashboardHeader";

describe("DashboardHeader", () => {
  afterEach(cleanup);

  it("greets by time once the clock is known and switches range", () => {
    const onRangeChange = vi.fn();
    render(
      <DashboardHeader
        now={new Date(2026, 9, 28, 9)}
        name="Sam"
        range="week"
        onRangeChange={onRangeChange}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Sam");
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onRangeChange).toHaveBeenCalledWith("today");
  });

  it("renders a neutral heading before the clock is set", () => {
    render(<DashboardHeader now={null} name="Sam" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Sam");
    expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
  });
});
