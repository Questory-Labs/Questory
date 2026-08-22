import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminUsersView } from "./admin.users.view";
import type { AdminUsersResponse, AdminUsersViewProps } from "./admin.users.types";
import type { AdminUser } from "./components/AdminUserCard";

vi.mock("./components/AdminUserCard", () => ({
  AdminUserCard: ({ user }: { user: AdminUser }) => <div>{user.personaName}</div>,
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

const usersValue: AdminUsersResponse = {
  users: [alice],
  startFreshEnabled: true,
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
  });
});
