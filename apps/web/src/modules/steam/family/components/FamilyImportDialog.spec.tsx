import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Friend, FriendsListResponse } from "@questorylabs/shared";
import { FamilyImportDialog } from "./FamilyImportDialog";

const reload = async () => undefined;

const resource = (
  patch: Partial<UseResourceResult<FriendsListResponse>> &
    Pick<UseResourceResult<FriendsListResponse>, "empty" | "failed">,
): UseResourceResult<FriendsListResponse> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<FriendsListResponse>;

const alex: Friend = {
  steamId: "2",
  personaName: "Alex",
  avatarUrl: null,
};

const friendsPage: FriendsListResponse = {
  friends: [alex],
  total: 1,
  page: 1,
  pageSize: 100,
  meta: {
    totalFriends: 1,
    librariesCached: 0,
    libraryCacheLimit: 0,
    gamesPerFriendLimit: 0,
    truncated: false,
    lastSyncedAt: null,
  },
};

const renderDialog = (
  patch: Partial<Parameters<typeof FamilyImportDialog>[0]> = {},
) => {
  const onClose = vi.fn();
  const onImportSelected = vi.fn();
  const toggle = vi.fn();
  const toggleAll = vi.fn();
  const setImportFilter = vi.fn();
  render(
    <FamilyImportDialog
      open
      onClose={onClose}
      friends={resource({
        empty: false,
        failed: false,
        value: friendsPage,
      })}
      importable={[alex]}
      selected={new Set()}
      importFilter=""
      setImportFilter={setImportFilter}
      toggle={toggle}
      toggleAll={toggleAll}
      importBusy={false}
      onImportSelected={onImportSelected}
      importError={null}
      remainingSlots={5}
      {...patch}
    />,
  );
  return { onClose, onImportSelected, toggle, toggleAll };
};

describe("FamilyImportDialog", () => {
  afterEach(cleanup);

  it("renders nothing when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists importable friends in a dialog", () => {
    const { toggle } = renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Import from friends" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(toggle).toHaveBeenCalledWith("2");
  });

  it("does not close while an import is running", () => {
    const { onClose } = renderDialog({ importBusy: true });
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("imports the current selection", () => {
    const { onImportSelected } = renderDialog({
      selected: new Set(["2"]),
    });
    fireEvent.click(screen.getByRole("button", { name: "Add selected (1)" }));
    expect(onImportSelected).toHaveBeenCalledTimes(1);
  });

  it("does not list friends that were not marked importable", () => {
    renderDialog({ importable: [] });
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(
      screen.getByText("All synced friends are already in your family group."),
    ).toBeInTheDocument();
  });

  it("does not list friends when the family is full", () => {
    renderDialog({ remainingSlots: 0, importable: [alex] });
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Family is full (6 people, including you). Remove someone to add another friend.",
      ),
    ).toBeInTheDocument();
  });

  it("disables extra checkboxes once remaining slots are filled", () => {
    const bob: Friend = { steamId: "3", personaName: "Bob", avatarUrl: null };
    renderDialog({
      remainingSlots: 1,
      importable: [alex, bob],
      selected: new Set(["2"]),
    });
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes[0]).toBeChecked();
    expect(boxes[0]).not.toBeDisabled();
    expect(boxes[1]).toBeDisabled();
  });
});
