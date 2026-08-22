import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  CurationJob,
  FeedbackAction,
  RecommendationDomain,
  RecommendationItem,
  RecommendationResponse,
  UserSettings,
} from "@/lib/enterprise-types";

export type RecsTab = RecommendationDomain | "all";

export type CurateOptions = {
  /** Clear cache and re-run the agentic pipeline. */
  force: boolean;
};

export type RecommendationsViewProps = {
  tab: RecsTab;
  setTab: Dispatch<SetStateAction<RecsTab>>;
  jobId: string | null;
  peekHeuristics: boolean;
  setPeekHeuristics: Dispatch<SetStateAction<boolean>>;
  curated: RecommendationResponse | null;
  fromCache: boolean;
  votes: Record<string, FeedbackAction>;
  fading: Set<string>;
  dismissed: Set<string>;
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  recs: UseResourceResult<RecommendationResponse>;
  settings: UseResourceResult<UserSettings>;
  job: UseResourceResult<CurationJob>;
  curate: (mood: string | undefined, options: CurateOptions) => void;
  useCached: (mood: string | undefined) => void;
  recurate: () => void;
  onFeedback: (item: RecommendationItem, action: FeedbackAction) => void;
};

export type RecommendationCardProps = {
  item: RecommendationItem;
  vote?: FeedbackAction;
  dismissed: boolean;
  onFeedback: (item: RecommendationItem, action: FeedbackAction) => void;
};
