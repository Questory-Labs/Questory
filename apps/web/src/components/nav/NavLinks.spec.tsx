import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NavLinks } from "./NavLinks";
import { buildNavGroups } from "./nav-config";

describe("NavLinks", () => {
  afterEach(cleanup);

  it("marks the longest media href current, not the domain home", () => {
    render(
      <NavLinks
        pathname="/music/listening"
        groups={buildNavGroups({ music: true })}
      />,
    );
    expect(screen.getByRole("link", { name: "Listening" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByText("Music")).toBeInTheDocument();
  });
});
