import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchScopeTabs } from "./SearchScopeTabs";

describe("SearchScopeTabs", () => {
  afterEach(cleanup);

  it("hides when only one domain has results", () => {
    const { container } = render(
      <SearchScopeTabs scopes={["all", "games"]} value="all" onChange={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("presses the active scope and reports picks", () => {
    const onChange = vi.fn();
    render(<SearchScopeTabs scopes={["all", "games", "music"]} value="games" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Games" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Music" }));
    expect(onChange).toHaveBeenCalledWith("music");
  });
});
