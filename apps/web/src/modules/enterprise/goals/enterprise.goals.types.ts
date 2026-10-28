import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  Goal,
  GoalListResponse,
  GoalTimeframe,
  PlaySessionStats,
} from "@questorylabs/shared";
import type {
  GoalSuggestion,
  RecommendationGoalsResponse,
} from "@/lib/enterprise-types";
import type { GoalPeriod } from "./enterprise.goals.utils";

export type GoalsViewProps = {
  timeframe: GoalTimeframe;
  setTimeframe: (timeframe: GoalTimeframe) => void;
  targetCount: number;
  setTargetCount: (count: number) => void;
  goals: UseResourceResult<GoalListResponse>;
  suggestions: UseResourceResult<RecommendationGoalsResponse>;
  stats: UseResourceResult<PlaySessionStats>;
  current: Goal[];
  pending: GoalSuggestion[];
  reasons: Record<string, string>;
  period: GoalPeriod;
  now: Date;
  weeklyHours: number | null;
  acceptingKey: string | null;
  togglingId: string | null;
  removeTarget: Goal | null;
  setRemoveTarget: Dispatch<SetStateAction<Goal | null>>;
  removing: boolean;
  actionFailed: boolean;
  onAccept: (suggestion: GoalSuggestion) => void;
  onToggle: (goal: Goal) => void;
  onConfirmRemove: () => void;
};
