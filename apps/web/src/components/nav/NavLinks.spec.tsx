import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NavLinks } from "./NavLinks";
import { buildNavFooter, buildNavGroups } from "./nav-config";

describe("NavLinks", () => {
  afterEach(cleanup);

  it("marks the longest media href current, not the domain overview", () => {
    render(<NavLinks pathname="/music/listening" groups={buildNavGroups({ music: true })} />);
    expect(screen.getByRole("link", { name: "Listening" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("opens the active section and keeps the others collapsed", () => {
    render(<NavLinks pathname="/music/charts" groups={buildNavGroups({ music: true })} />);
    expect(screen.getByRole("button", { name: "Music" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Games" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("toggles a section open and closed", () => {
    render(<NavLinks pathname="/dashboard" groups={buildNavGroups({ watch: true })} />);
    const watch = screen.getByRole("button", { name: "Watch" });
    expect(watch).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(watch);
    expect(watch).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(watch);
    expect(watch).toHaveAttribute("aria-expanded", "false");
  });

  it("highlights the footer Sources link on per-domain settings pages", () => {
    render(
      <NavLinks
        pathname="/watch/settings"
        groups={buildNavGroups({ watch: true })}
        footer={buildNavFooter({ watch: true })}
      />,
    );
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("aria-current", "page");
  });

  it("shows compact section counts in collapsible headers", () => {
    render(
      <NavLinks
        pathname="/dashboard"
        groups={buildNavGroups({ music: true })}
        counts={{ games: 412, music: 8200 }}
      />,
    );
    expect(screen.getByRole("button", { name: "Games 412" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Music 8.2k" })).toBeInTheDocument();
  });
});
