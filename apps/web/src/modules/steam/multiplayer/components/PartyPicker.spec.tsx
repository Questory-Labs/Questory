import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Friend, FriendsListResponse } from "@questorylabs/shared";
import { PartyPicker } from "./PartyPicker";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";

const list: Friend[] = [
  { steamId: "1", personaName: "Alice", avatarUrl: null },
  { steamId: "2", personaName: "Bob", avatarUrl: null, personaState: 1 },
];

const friends = {
  value: {
    friends: list,
    total: 2,
    page: 1,
    pageSize: 2,
    meta: {
      totalFriends: 2,
      librariesCached: 0,
      libraryCacheLimit: 50,
      gamesPerFriendLimit: 200,
      truncated: false,
      lastSyncedAt: null,
    },
  },
  ready: true,
  empty: false,
  failed: false,
} as unknown as UseResourceResult<FriendsListResponse>;

const filtersWith = (patch: Record<string, unknown>) =>
  ({
    selected: [],
    friendFilter: "",
    setFriendFilter: () => undefined,
    filteredFriends: list,
    toggle: () => undefined,
    ...patch,
  }) as unknown as MultiplayerViewProps["filters"];

describe("PartyPicker", () => {
  afterEach(cleanup);

  it("lists selected first then online friends and toggles", () => {
    const toggle = vi.fn();
    render(
      <PartyPicker friends={friends} filters={filtersWith({ selected: ["1"], toggle })} />,
    );
    const chips = screen.getAllByRole("button");
    expect(chips[0]).toHaveTextContent("Alice");
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chips[1]);
    expect(toggle).toHaveBeenCalledWith("2");
  });

  it("shows a no-match hint", () => {
    render(
      <PartyPicker
        friends={friends}
        filters={filtersWith({ filteredFriends: [], friendFilter: "zz" })}
      />,
    );
    expect(screen.getByText("No friends match “zz”.")).toBeInTheDocument();
  });
});
