import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  GameDetail,
  LibraryEntry,
  LibraryUserStatus,
  PlaySessionPage,
} from "@questorylabs/shared";
import type { LibraryGameTab } from "./steam.library-game.constants";

export type LibraryGameViewProps = {
  gameId: string;
  entry: UseResourceResult<LibraryEntry>;
  detail: UseResourceResult<GameDetail>;
  sessions: UseResourceResult<PlaySessionPage>;
  setStatus?: UseActionResult<unknown, LibraryUserStatus | null>;
  tab?: LibraryGameTab;
  setTab?: (tab: LibraryGameTab) => void;
};
