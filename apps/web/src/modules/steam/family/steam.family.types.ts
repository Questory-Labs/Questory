import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  FamilyInsights,
  FamilyLibrary,
  FamilyMemberSummary,
  Friend,
  FriendsListResponse,
} from "@questorylabs/shared";

export type FamilyViewProps = {
  insights: UseResourceResult<FamilyInsights>;
  library: UseResourceResult<FamilyLibrary>;
  conflicts: UseResourceResult<FamilyLibrary>;
  friends: UseResourceResult<FriendsListResponse>;
  members: FamilyMemberSummary[];
  steamId: string;
  setSteamId: (value: string) => void;
  addError: string | null;
  addBusy: boolean;
  onAdd: () => void;
  showImport: boolean;
  onToggleImport: () => void;
  importable: Friend[];
  selected: Set<string>;
  importFilter: string;
  setImportFilter: (value: string) => void;
  toggle: (id: string) => void;
  toggleAll: () => void;
  importBusy: boolean;
  onImportSelected: () => void;
  activeMember: string;
  setActiveMember: (id: string) => void;
  gameSearch: string;
  setGameSearch: (value: string) => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  conflictsPage: number;
  setConflictsPage: Dispatch<SetStateAction<number>>;
  selectedAppId: number | null;
  setSelectedAppId: (appId: number | null) => void;
};
