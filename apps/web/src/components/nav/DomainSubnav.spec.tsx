import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DomainSubnav } from "./DomainSubnav";
import { MUSIC_SUBNAV } from "./nav-config";

vi.mock("next/navigation", () => ({
  usePathname: () => "/music/listening",
}));

describe("DomainSubnav", () => {
  afterEach(cleanup);

  it("renders a tablist and marks the matching subroute current", () => {
    render(<DomainSubnav items={MUSIC_SUBNAV} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Listening" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("tab", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
