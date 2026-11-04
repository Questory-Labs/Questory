import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TickScrubber } from "./TickScrubber";

describe("TickScrubber", () => {
  it("reports progress as a percentage", () => {
    render(<TickScrubber value={0.42} label="Episode progress" />);
    const bar = screen.getByRole("progressbar", { name: "Episode progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("clamps out-of-range values", () => {
    render(<TickScrubber value={-1} label="Empty" />);
    expect(screen.getByRole("progressbar", { name: "Empty" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
