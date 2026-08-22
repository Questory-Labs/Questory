import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadLibraryPage, ReadListStatus } from "@questorylabs/shared";

export type ReadLibraryViewProps = {
  library: UseResourceResult<ReadLibraryPage>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  status: "" | ReadListStatus;
  setStatus: Dispatch<SetStateAction<"" | ReadListStatus>>;
  format: string;
  setFormat: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  qDraft: string;
  setQDraft: Dispatch<SetStateAction<string>>;
  onSearch: () => void;
};
