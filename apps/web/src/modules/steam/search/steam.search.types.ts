import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import type { SemanticSearchResult } from "@/lib/enterprise-api";

export type SearchMode = "exact" | "meaning";

export type SearchViewProps = {
  q: string;
  chips: string[];
  result: UseResourceResult<SearchResult>;
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
  mode: SearchMode;
  meaningAvailable: boolean;
  meaning: UseResourceResult<SemanticSearchResult>;
};
