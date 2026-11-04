import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersTable } from "./AdminUsersTable";
import type { AdminUser } from "../admin.users.types";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";

const user: AdminUser = {
  id: "user-1",
  email: "test@example.com",
  isAdmin: false,
  personaName: "Test User",
  steamId: "76561198000000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: null,
};

const renderTable = () => {
  const onMessage = vi.fn();
  render(
    <ResourceProvider store={new ResourceStore({ retries: false })}>
      <AdminUsersTable users={[user]} startFreshEnabled onMessage={onMessage} />
    </ResourceProvider>,
  );
  return onMessage;
};

describe("AdminUsersTable", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset().mockResolvedValue({ ok: true } as never);
  });
  afterEach(cleanup);

  it("confirms delete before calling the API", async () => {
    const onMessage = renderTable();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete user…" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/admin/users/user-1", { method: "DELETE" }),
    );
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith("Deleted"));
  });

  it("confirms sync targets", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Sync Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sync catalog" }));
    expect(screen.getByText(/Enqueue a full Steam library/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/admin/ops/user-sync-target", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", target: "catalog" }),
      }),
    );
  });

  it("cancel closes the dialog without calling the API", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Test User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Promote to admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it("saves edits through PATCH", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/admin/users/user-1", {
        method: "PATCH",
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    );
  });
});
