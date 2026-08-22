import type { ReactNode } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";

export type MediaHistoryPage<TItem> = {
  items: TItem[];
  total: number;
  pageSize: number;
};

export type MediaHistoryViewProps<TItem> = {
  recent: UseResourceResult<MediaHistoryPage<TItem>>;
  page: number;
  setPage: (page: number) => void;
  title: string;
  description: string;
  actions?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  errorMessage: string;
  renderItem: (item: TItem) => ReactNode;
};
