import type { Dispatch, SetStateAction } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";

export type CollectionDetailGame = {
  appId: number;
  name: string;
  headerImage: string | null;
  genres: string[];
};

export type CollectionDetailResponse = {
  id?: string;
  name: string;
  description: string | null;
  type: string;
  ruleKey?: string | null;
  color?: string | null;
  total: number;
  page: number;
  pageSize: number;
  games: CollectionDetailGame[];
};

export type CollectionEditInput = {
  name: string;
  description?: string;
  color: string | null;
};

export type CollectionDetailViewProps = {
  collection: UseResourceResult<CollectionDetailResponse>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  update?: UseActionResult<unknown, CollectionEditInput>;
  remove?: UseActionResult<unknown, void>;
  editOpen?: boolean;
  setEditOpen?: (open: boolean) => void;
  deleteOpen?: boolean;
  setDeleteOpen?: (open: boolean) => void;
};
