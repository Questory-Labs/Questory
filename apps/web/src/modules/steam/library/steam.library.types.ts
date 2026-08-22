import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { LibraryEntry, Store } from "@questorylabs/shared";
import type { useSyncJobs } from "@/hooks/useSyncJobs";

export type LibraryListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: LibraryEntry[];
};

export type LibraryViewProps = {
  library: UseResourceResult<LibraryListResponse>;
  sync: ReturnType<typeof useSyncJobs>;
  activeStore: Store | "all";
  setStore: (store: Store | "all") => void;
  q: string;
  setQ: Dispatch<SetStateAction<string>>;
  genre: string;
  setGenre: Dispatch<SetStateAction<string>>;
  unplayed: boolean;
  setUnplayed: Dispatch<SetStateAction<boolean>>;
  multiplayer: boolean;
  setMultiplayer: Dispatch<SetStateAction<boolean>>;
  deck: boolean;
  setDeck: Dispatch<SetStateAction<boolean>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
};
