import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendCompare, FriendsListResponse } from "@questorylabs/shared";

export type FriendsViewProps = {
  friends: UseResourceResult<FriendsListResponse>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  query: string;
  setQuery: (value: string) => void;
  search: string;
  activeSteamId: string | null;
  selectFriend: (steamId: string) => void;
  compare: UseResourceResult<FriendCompare>;
};
