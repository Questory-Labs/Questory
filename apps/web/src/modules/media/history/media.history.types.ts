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
  title: ReactNode;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  showCount?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  errorMessage: string;
  listLabel?: string;
  renderItem: (item: TItem, index: number) => ReactNode;
};
