import type { Dispatch, SetStateAction } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type { Collection } from "@questorylabs/shared";

export type CollectionsViewProps = {
  list: UseResourceResult<Collection[]>;
  create: UseActionResult<unknown, void>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  tasteAvailable?: boolean;
  groupByTaste?: UseActionResult<{ available: boolean; collections: number }, void>;
};
