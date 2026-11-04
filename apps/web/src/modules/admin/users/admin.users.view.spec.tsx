import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminUsersView } from "./admin.users.view";
import type { AdminUsersResponse, AdminUsersViewProps } from "./admin.users.types";
import type { AdminUser } from "./admin.users.types";

vi.mock("./components/AdminUsersTable", () => ({
  AdminUsersTable: ({ users }: { users: AdminUser[] }) => (
    <div>
      {users.map((u) => (
        <div key={u.id}>{u.personaName}</div>
      ))}
    </div>
  ),
}));

vi.mock("./components/AdminAddUserDialog", () => ({
  AdminAddUserDialog: () => <div>Add user dialog</div>,
}));

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const alice: AdminUser = {
  id: "user-1",
  email: "alice@example.com",
  isAdmin: true,
  personaName: "Alice",
  steamId: "76561198000000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: null,
};

const bob: AdminUser = {
  ...alice,
  id: "user-2",
  email: "bob@example.com",
  isAdmin: false,
  personaName: "Bob",
  steamId: null,
};

const usersValue: AdminUsersResponse = {
  users: [alice, bob],
  startFreshEnabled: true,
  failingSyncCount: 1,
};

const renderView = (patch: Partial<AdminUsersViewProps>) =>
  render(
    <AdminUsersView
      {...({
        users: resource<AdminUsersResponse>({
          empty: false,
          failed: false,
          value: usersValue,
        }),
        msg: null,
        setMsg: () => undefined,
        addOpen: false,
        setAddOpen: () => undefined,
        ...patch,
      } as AdminUsersViewProps)}
    />,
  );

describe("AdminUsersView", () => {
  afterEach(cleanup);

  it("shows skeletons when users are empty", () => {
    renderView({
      users: resource<AdminUsersResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows an error when users failed, even if empty", () => {
    renderView({
      users: resource<AdminUsersResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("renders users when ready", () => {
    renderView({});
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("1 out of sync")).toBeInTheDocument();
    expect(screen.getByText("1 admin")).toBeInTheDocument();
  });

  it("filters users by search", () => {
    renderView({});
    fireEvent.change(screen.getByPlaceholderText("Search by email or name"), {
      target: { value: "bob" },
    });
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("opens the add user dialog", () => {
    const setAddOpen = vi.fn();
    renderView({ setAddOpen });
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    expect(setAddOpen).toHaveBeenCalledWith(true);
  });
});
