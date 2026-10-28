import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SourcesOverview } from "@questorylabs/shared";
import type { SourcesFlashMessage } from "./media.sources.utils";

export type SourcesTab = "music" | "watch" | "read";

export type MediaSourcesViewProps = {
  tabs: { value: SourcesTab; label: string }[];
  tab: SourcesTab | null;
  loading: boolean;
  onTabChange: (tab: SourcesTab) => void;
  overview?: UseResourceResult<SourcesOverview>;
  flash?: SourcesFlashMessage[];
};
