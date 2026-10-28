import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DomainTabs } from "./DomainTabs";

describe("DomainTabs", () => {
  afterEach(cleanup);

  it("marks the active domain and reports picks", () => {
    const onChange = vi.fn();
    render(<DomainTabs tab="music" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Music" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(onChange).toHaveBeenCalledWith("read");
  });
});
