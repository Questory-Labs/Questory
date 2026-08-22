import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";

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
  total: number;
  page: number;
  pageSize: number;
  games: CollectionDetailGame[];
};

export type CollectionDetailViewProps = {
  collection: UseResourceResult<CollectionDetailResponse>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
};
