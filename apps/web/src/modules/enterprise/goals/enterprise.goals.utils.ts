import type { Goal, GoalTimeframe, PlaySessionStats } from "@questorylabs/shared";
import type { GoalSuggestion } from "@/lib/enterprise-types";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export type GoalPeriod = { start: Date; end: Date };

export const localPeriod = (timeframe: GoalTimeframe, now: Date): GoalPeriod => {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (timeframe === "year") {
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  if (timeframe === "month") {
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
  }
  const offset = (now.getDay() + 6) % 7;
  const start = new Date(y, m, now.getDate() - offset);
  return { start, end: new Date(y, m, now.getDate() - offset + 7) };
};

export const isCurrentGoal = (goal: Goal, now: Date): boolean =>
  new Date(goal.periodStart).getTime() <= now.getTime() &&
  new Date(goal.periodEnd).getTime() > now.getTime();

export const currentPeriod = (
  timeframe: GoalTimeframe,
  goals: Goal[],
  now: Date,
): GoalPeriod => {
  const first = goals[0];
  if (first) {
    return { start: new Date(first.periodStart), end: new Date(first.periodEnd) };
  }
  return localPeriod(timeframe, now);
};

export const periodElapsed = (period: GoalPeriod, now: Date): number => {
  const span = period.end.getTime() - period.start.getTime();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (now.getTime() - period.start.getTime()) / span));
};

const shortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const periodEdgeLabels = (period: GoalPeriod): [string, string] => [
  shortDate(period.start),
  shortDate(new Date(period.end.getTime() - 1)),
];

export const periodTitle = (timeframe: GoalTimeframe, period: GoalPeriod): string => {
  if (timeframe === "year") return String(period.start.getFullYear());
  if (timeframe === "month") {
    return period.start.toLocaleDateString(undefined, { month: "long" });
  }
  return `Week of ${shortDate(period.start)}`;
};

export const formatHours = (minutes: number): string => {
  const hours = minutes / 60;
  if (hours < 10) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round(hours)}h`;
};

export const remainingMinutes = (goals: Goal[]): number =>
  goals
    .filter((goal) => !goal.doneAt)
    .reduce((sum, goal) => sum + (goal.estimatedMinutes ?? 0), 0);

export const weeklyAverageHours = (
  stats: PlaySessionStats | undefined,
  days: number,
): number | null => {
  const secs = stats?.window?.totalDurationSecs ?? 0;
  if (secs <= 0 || days <= 0) return null;
  return secs / 3600 / (days / 7);
};

export const fitsInPeriod = (
  leftMinutes: number,
  weeklyHours: number,
  period: GoalPeriod,
  now: Date,
): boolean => {
  const weeksLeft = Math.max(0, period.end.getTime() - now.getTime()) / WEEK_MS;
  return leftMinutes / 60 <= weeklyHours * weeksLeft;
};

export const pendingSuggestions = (
  suggestions: GoalSuggestion[],
  goals: Goal[],
): GoalSuggestion[] => {
  const taken = new Set(goals.map((goal) => goal.targetRef).filter(Boolean));
  return suggestions.filter((s) => !taken.has(s.itemKey));
};

export const suggestionReasons = (
  suggestions: GoalSuggestion[],
): Record<string, string> =>
  Object.fromEntries(suggestions.map((s) => [s.itemKey, s.reason]));
