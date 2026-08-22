import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  FriendsListResponse,
  MultiplayerPlanGame,
  MultiplayerPlanResponse,
} from "@questorylabs/shared";
import type { Dispatch, SetStateAction } from "react";
import type { useMultiplayerPlanFilters } from "./steam.multiplayer.hooks";

export type PartyFriend = {
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
};

export type MultiplayerViewProps = {
  friends: UseResourceResult<FriendsListResponse>;
  plan: UseResourceResult<MultiplayerPlanResponse>;
  partyFriends: PartyFriend[];
  pageGames: MultiplayerPlanGame[];
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  selectedAppId: number | null;
  setSelectedAppId: (id: number | null) => void;
  filters: ReturnType<typeof useMultiplayerPlanFilters>;
};
