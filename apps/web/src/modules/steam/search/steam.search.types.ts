import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";

export type SearchViewProps = {
  q: string;
  chips: string[];
  result: UseResourceResult<SearchResult>;
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
};
