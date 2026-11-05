import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Friend, FriendsListResponse } from "@questorylabs/shared";
import { PartyPicker } from "./PartyPicker";
import { PARTY_PICKER_LIMIT } from "../steam.multiplayer.constants";
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

  it("omits the select when every friend has a chip", () => {
    render(<PartyPicker friends={friends} filters={filtersWith({})} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("lists overflow friends alphabetically in a select and toggles the pick", () => {
    const toggle = vi.fn();
    const many: Friend[] = Array.from(
      { length: PARTY_PICKER_LIMIT },
      (_, i) => ({
        steamId: `online-${i}`,
        personaName: `Online ${i}`,
        avatarUrl: null,
        personaState: 1,
      }),
    ).concat([
      { steamId: "z", personaName: "zed", avatarUrl: null, personaState: 0 },
      { steamId: "a", personaName: "Amy", avatarUrl: null, personaState: 0 },
    ]);
    render(
      <PartyPicker
        friends={
          { ...friends, value: { ...friends.value, friends: many } } as typeof friends
        }
        filters={filtersWith({ toggle })}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Add a friend" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Add from 2 more friends…", "Amy", "zed"]);
    fireEvent.change(select, { target: { value: "z" } });
    expect(toggle).toHaveBeenCalledWith("z");
    expect(select).toHaveValue("");
  });
});
