import type { GoalTimeframe } from "@questorylabs/shared";

export const GOAL_TIMEFRAME_OPTIONS: readonly { value: GoalTimeframe; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export const SMART_GOAL_TIMEFRAME: Record<GoalTimeframe, string> = {
  week: "this week",
  month: "this month",
  year: "this year",
};

export const GOAL_TARGET_COUNTS = [1, 3, 5, 10] as const;
export const GOAL_DEFAULT_TARGET = 5;
export const GOAL_DEFAULT_TIMEFRAME: GoalTimeframe = "month";
export const GOALS_LIST_LIMIT = 50;
export const GOALS_STATS_DAYS = 30;
export const GOALS_RESOURCE_ID = ["goals"] as const;
