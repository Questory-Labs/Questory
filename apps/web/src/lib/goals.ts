import type {
  Goal,
  GoalCreate,
  GoalDeleteResult,
  GoalDomain,
  GoalListResponse,
  GoalStatus,
  GoalTimeframe,
  GoalUpdate,
} from "@questorylabs/shared";
import { api } from "@/lib/api";

export const GOAL_KIND_LABELS: Record<string, string> = {
  game: "Finish",
  movie: "Watch",
  show: "Watch",
  manga: "Read",
  artist: "Listen",
  track: "Listen",
  daily_listens: "Daily listens",
};

export const goalKindLabel = (kind: string): string =>
  GOAL_KIND_LABELS[kind] ?? kind.replace(/_/g, " ");

export const GOAL_DOMAIN_COLOR: Record<GoalDomain, string> = {
  games: "var(--games)",
  music: "var(--music)",
  watch: "var(--watch)",
  read: "var(--read)",
};

export function goalsPath(params: {
  domain?: GoalDomain;
  status?: GoalStatus;
  timeframe?: GoalTimeframe;
  limit?: number;
}): string {
  const qs = new URLSearchParams();
  if (params.domain) qs.set("domain", params.domain);
  if (params.status) qs.set("status", params.status);
  if (params.timeframe) qs.set("timeframe", params.timeframe);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return query ? `/goals?${query}` : "/goals";
}

export const fetchGoals = (params: Parameters<typeof goalsPath>[0] = {}) =>
  api<GoalListResponse>(goalsPath(params));

export const createGoal = (body: GoalCreate) =>
  api<Goal>("/goals", { method: "POST", body: JSON.stringify(body) });

export const updateGoal = (id: string, body: GoalUpdate) =>
  api<Goal>(`/goals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteGoal = (id: string) =>
  api<GoalDeleteResult>(`/goals/${encodeURIComponent(id)}`, { method: "DELETE" });

export const goalProgress = (goal: Goal): number => {
  if (goal.doneAt) return 1;
  if (goal.targetValue && goal.targetValue > 0) {
    return Math.max(0, Math.min(1, goal.progressValue / goal.targetValue));
  }
  return 0;
};
