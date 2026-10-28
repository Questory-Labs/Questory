import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminSystemView } from "./admin.system.view";
import type { AdminSystemViewProps } from "./admin.system.types";

vi.mock("../settings/admin.settings.controller", () => ({
  AdminSettingsController: () => <div>settings body</div>,
}));
vi.mock("../migrations/admin.migrations.controller", () => ({
  AdminMigrationsController: () => <div>migrations body</div>,
}));

const renderView = (patch: Partial<AdminSystemViewProps>) =>
  render(
    <AdminSystemView
      {...({ tab: "settings", setTab: () => undefined, ...patch } as AdminSystemViewProps)}
    />,
  );

describe("AdminSystemView", () => {
  afterEach(cleanup);

  it("renders the header and the settings tab", () => {
    renderView({});
    expect(screen.getByText("switches and moves")).toBeInTheDocument();
    expect(screen.getByText("settings body")).toBeInTheDocument();
    expect(screen.queryByText("migrations body")).not.toBeInTheDocument();
  });

  it("renders the migrations tab", () => {
    renderView({ tab: "migrations" });
    expect(screen.getByText("migrations body")).toBeInTheDocument();
  });

  it("switches tabs through setTab", () => {
    const setTab = vi.fn();
    renderView({ setTab });
    fireEvent.click(screen.getByRole("button", { name: "Migrations" }));
    expect(setTab).toHaveBeenCalledWith("migrations");
  });
});
