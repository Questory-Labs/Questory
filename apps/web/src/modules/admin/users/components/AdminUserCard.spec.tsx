import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUserCard, type AdminUser } from "./AdminUserCard";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

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
};

const renderCard = (
  overrides?: Partial<Parameters<typeof AdminUserCard>[0]>,
) => {
  const qc = new ResourceStore({ retries: false });

  return render(
    <ResourceProvider store={qc}>
      <AdminUserCard
        user={user}
        startFreshEnabled
        onMessage={vi.fn()}
        {...overrides}
      />
    </ResourceProvider>,
  );
};

describe("AdminUserCard", () => {
  it("shows edit actions and swaps to save/cancel while editing", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("opens a confirmation dialog before delete", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();
  });

  it("opens a confirmation dialog before sync actions", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Sync catalog" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Enqueue a full Steam library/)).toBeInTheDocument();
  });
});
