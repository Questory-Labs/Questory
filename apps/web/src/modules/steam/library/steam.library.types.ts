import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  Collection,
  LibraryListResponse,
  LibrarySort,
  LibraryStatusFilter,
  Store,
} from "@questorylabs/shared";
import type { useSyncJobs } from "@/hooks/useSyncJobs";
import type { LibraryLayout } from "./steam.library.constants";

export type { LibraryListResponse };

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
  status: LibraryStatusFilter | "all";
  setStatus: Dispatch<SetStateAction<LibraryStatusFilter | "all">>;
  sort: LibrarySort;
  setSort: Dispatch<SetStateAction<LibrarySort>>;
  layout: LibraryLayout;
  setLayout: Dispatch<SetStateAction<LibraryLayout>>;
  collections?: UseResourceResult<Collection[]>;
};
