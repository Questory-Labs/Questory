import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminNavLinks } from "./AdminNavLinks";
import { buildAdminNavGroups } from "../admin.nav";

describe("AdminNavLinks", () => {
  afterEach(cleanup);

  it("marks merged legacy routes under their new item", () => {
    render(<AdminNavLinks pathname="/admin/migrations" groups={buildAdminNavGroups(false)} />);
    expect(screen.getByRole("link", { name: "Settings & migrations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByTestId("admin-nav-dot")).toHaveLength(1);
  });

  it("includes QEngine only when enterprise is enabled", () => {
    const { rerender } = render(
      <AdminNavLinks pathname="/admin" groups={buildAdminNavGroups(false)} />,
    );
    expect(screen.queryByRole("link", { name: "Telemetry" })).toBeNull();
    rerender(<AdminNavLinks pathname="/admin/telemetry" groups={buildAdminNavGroups(true)} />);
    expect(screen.getByRole("link", { name: "Telemetry" })).toHaveAttribute("aria-current", "page");
  });

  it("calls onNavigate when a link is clicked", () => {
    const onNavigate = vi.fn();
    render(
      <AdminNavLinks pathname="/admin" groups={buildAdminNavGroups(false)} onNavigate={onNavigate} />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Back to app" }));
    expect(onNavigate).toHaveBeenCalled();
  });
});
