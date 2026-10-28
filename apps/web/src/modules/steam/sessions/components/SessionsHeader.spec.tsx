import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessionsHeader } from "./SessionsHeader";

describe("SessionsHeader", () => {
  afterEach(cleanup);

  it("shows the count with the daypart and switches range", () => {
    const onRangeChange = vi.fn();
    render(
      <SessionsHeader
        count={42}
        daypart="mostly after dark"
        range="30"
        onRangeChange={onRangeChange}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "42 sessions, mostly after dark" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 d" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "14 d" }));
    expect(onRangeChange).toHaveBeenCalledWith("14");
  });

  it("falls back to a plain title before counts load", () => {
    render(
      <SessionsHeader count={null} daypart={null} range="14" onRangeChange={() => undefined} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Sessions" })).toBeInTheDocument();
  });
});
