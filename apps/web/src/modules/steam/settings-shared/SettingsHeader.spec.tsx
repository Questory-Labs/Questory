import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsHeader } from "./SettingsHeader";

describe("SettingsHeader", () => {
  afterEach(() => cleanup());

  it("renders the title, description and tab links with the active one current", () => {
    render(
      <SettingsHeader
        active="connections"
        title={<>Two sources</>}
        description="Read-only"
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Two sources");
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Settings" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/settings/profile");
    expect(screen.getByRole("link", { name: "Stores" })).toHaveAttribute("href", "/settings/stores");
    expect(screen.getByRole("link", { name: "Connections" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Profile" })).not.toHaveAttribute("aria-current");
  });
});
