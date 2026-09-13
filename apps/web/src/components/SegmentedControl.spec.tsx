import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

describe("SegmentedControl", () => {
  afterEach(cleanup);

  it("marks the active option and reports changes", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Media type"
        value="all"
        onChange={onChange}
        options={[
          { value: "all", label: "All" },
          { value: "movie", label: "Movies" },
        ]}
      />,
    );

    expect(screen.getByRole("group", { name: "Media type" })).toHaveClass(
      "header-control",
    );
    fireEvent.click(screen.getByRole("button", { name: "Movies" }));
    expect(onChange).toHaveBeenCalledWith("movie");
  });
});
