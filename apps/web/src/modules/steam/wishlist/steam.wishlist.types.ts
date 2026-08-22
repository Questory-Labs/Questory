import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type { DealAlert, Store, WishlistItem } from "@questorylabs/shared";
import type { Dispatch, SetStateAction } from "react";

export type Recommendation = WishlistItem & { reasons?: string[] };

export type WishlistResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: WishlistItem[];
};

export type WishlistViewProps = {
  list: UseResourceResult<WishlistResponse>;
  recommendations: UseResourceResult<Recommendation[]>;
  deals: UseResourceResult<DealAlert[]>;
  storeFilter: Store | "all";
  setStoreFilter: (store: Store | "all") => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  editing: string | null;
  target: string;
  setTarget: (value: string) => void;
  startEdit: (key: string, current: string) => void;
  stopEdit: () => void;
  update: UseActionResult<
    unknown,
    { store: Store; externalId: string; targetPrice: number | null }
  >;
  filteredRecs: Recommendation[];
  filteredDeals: DealAlert[];
};
