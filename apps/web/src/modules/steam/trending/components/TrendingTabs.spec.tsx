import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TrendingTabs } from "./TrendingTabs";

describe("TrendingTabs", () => {
  afterEach(cleanup);

  it("hides itself with a single medium", () => {
    const { container } = render(
      <TrendingTabs tabs={["games"]} value="games" onChange={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the selected tab and reports picks", () => {
    const onChange = vi.fn();
    render(<TrendingTabs tabs={["games", "watch", "read"]} value="watch" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Watch" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Games" })).toHaveAttribute("aria-selected", "false");
    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(onChange).toHaveBeenCalledWith("read");
  });
});
