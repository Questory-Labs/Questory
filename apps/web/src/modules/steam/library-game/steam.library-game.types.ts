import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { GameDetail, LibraryEntry, PlaySessionPage } from "@questorylabs/shared";

export type LibraryGameViewProps = {
  gameId: string;
  entry: UseResourceResult<LibraryEntry>;
  detail: UseResourceResult<GameDetail>;
  sessions: UseResourceResult<PlaySessionPage>;
};
