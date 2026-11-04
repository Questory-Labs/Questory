import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RewindDomainTabs } from "./RewindDomainTabs";

describe("RewindDomainTabs", () => {
  afterEach(cleanup);

  it("links every enabled domain and marks the current one", () => {
    render(<RewindDomainTabs domain="music" enabled={{ music: true, read: true }} />);
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Everything",
      "Games",
      "Music",
      "Read",
    ]);
    expect(screen.getByRole("link", { name: "Music" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Games" })).toHaveAttribute("href", "/library/rewind");
    expect(screen.queryByRole("link", { name: "Watch" })).toBeNull();
  });
});
