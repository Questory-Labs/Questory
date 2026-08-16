import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MusicRangePicker } from "./MusicRangePicker";

describe("MusicRangePicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("omits All unless includeAll is set", () => {
    const onChange = vi.fn();
    render(<MusicRangePicker value="week" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });

  it("includes All on detail pages", () => {
    const onChange = vi.fn();
    render(
      <MusicRangePicker value="all" onChange={onChange} includeAll />,
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
