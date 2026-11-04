import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUserCard, type AdminUser } from "./AdminUserCard";

afterEach(() => {
  cleanup();
});

const user: AdminUser = {
  id: "user-1",
  email: "test@example.com",
  isAdmin: true,
  personaName: "Test User",
  steamId: "76561198000000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: null,
  latestSync: { status: "failed", type: "library-sync", at: "2026-01-01T00:00:00.000Z" },
  modules: { games: true, music: false, watch: true, read: false },
};

const renderCard = (overrides?: Partial<Parameters<typeof AdminUserCard>[0]>) => {
  const props = {
    user,
    startFreshEnabled: true,
    pending: false,
    editing: false,
    onConfirm: vi.fn(),
    onEdit: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
  render(
    <table>
      <tbody>
        <AdminUserCard {...props} />
      </tbody>
    </table>,
  );
  return props;
};

describe("AdminUserCard", () => {
  it("shows steam id, role, modules and failing sync", () => {
    renderCard();
    expect(screen.getByText(/76561198000000000/)).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Games, Watch" })).toBeInTheDocument();
    expect(screen.getByText(/^Failed · /)).toBeInTheDocument();
  });

  it("starts editing and saves", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(props.onEdit).toHaveBeenCalledWith(true);
    cleanup();
    const editing = renderCard({ editing: true });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(editing.onSave).toHaveBeenCalledWith({ email: "test@example.com", password: undefined });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(editing.onEdit).toHaveBeenCalledWith(false);
  });

  it("requests confirmation for sync actions", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Sync Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sync catalog" }));
    expect(props.onConfirm).toHaveBeenCalledWith({ kind: "sync", user, target: "catalog" });
  });

  it("disables catalog sync without a steam account", () => {
    renderCard({ user: { ...user, steamId: null } });
    fireEvent.click(screen.getByRole("button", { name: "Sync Test User" }));
    expect(screen.getByRole("menuitem", { name: "Sync catalog" })).toBeDisabled();
  });

  it("offers demote, start fresh and delete in the more menu", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Demote admin" }));
    expect(props.onConfirm).toHaveBeenCalledWith({ kind: "role", user, promote: false });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete user…" }));
    expect(props.onConfirm).toHaveBeenCalledWith({ kind: "delete", user });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    expect(screen.getByRole("menuitem", { name: "Start fresh (clear synced data)" })).toBeInTheDocument();
  });

  it("hides start fresh outside development", () => {
    renderCard({ startFreshEnabled: false });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    expect(screen.queryByRole("menuitem", { name: /Start fresh/ })).toBeNull();
  });
});
