"use client";

import { useState, type PropsWithChildren } from "react";
import { useAction, useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { Goal, GoalTimeframe, PlaySessionStats } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { browserTimeZone, withTz } from "@/lib/dates";
import { fetchSmartGoals } from "@/lib/enterprise-api";
import type { GoalSuggestion } from "@/lib/enterprise-types";
import { createGoal, deleteGoal, fetchGoals, updateGoal } from "@/lib/goals";
import {
  GOALS_LIST_LIMIT,
  GOALS_RESOURCE_ID,
  GOALS_STATS_DAYS,
  GOAL_DEFAULT_TARGET,
  GOAL_DEFAULT_TIMEFRAME,
  SMART_GOAL_TIMEFRAME,
} from "./enterprise.goals.constants";
import {
  currentPeriod,
  isCurrentGoal,
  pendingSuggestions,
  suggestionReasons,
  weeklyAverageHours,
} from "./enterprise.goals.utils";

export const GoalsController = ({ children }: PropsWithChildren) => {
  const [timeframe, setTimeframe] = useState<GoalTimeframe>(GOAL_DEFAULT_TIMEFRAME);
  const [targetCount, setTargetCount] = useState(GOAL_DEFAULT_TARGET);
  const [removeTarget, setRemoveTarget] = useState<Goal | null>(null);
  const now = new Date();

  const goals = useResource({
    id: [...GOALS_RESOURCE_ID, timeframe],
    load: () => fetchGoals({ status: "all", timeframe, limit: GOALS_LIST_LIMIT }),
    freshFor: 30_000,
    retries: 1,
  });

  const suggestions = useResource({
    id: ["enterprise-goals", timeframe, targetCount],
    load: () =>
      fetchSmartGoals({ timeframe: SMART_GOAL_TIMEFRAME[timeframe], targetCount }),
    freshFor: 60_000,
    retries: 1,
  });

  const stats = useResource({
    id: ["play-sessions", "stats", GOALS_STATS_DAYS],
    load: () =>
      api<PlaySessionStats>(
        withTz(`/play-sessions/stats?days=${GOALS_STATS_DAYS}`),
      ),
    freshFor: 5 * 60_000,
    retries: 1,
  });

  const touches = [[...GOALS_RESOURCE_ID]];

  const accept = useAction({
    run: (suggestion: GoalSuggestion) =>
      createGoal({
        kind: suggestion.kind,
        name: suggestion.name,
        domain: suggestion.domain,
        estimatedMinutes:
          suggestion.estimatedTimeMinutes != null
            ? Math.round(suggestion.estimatedTimeMinutes)
            : null,
        targetRef: suggestion.itemKey,
        timeframe,
        tz: browserTimeZone(),
      }),
    touches,
  });

  const toggle = useAction({
    run: (goal: Goal) => updateGoal(goal.id, { done: !goal.doneAt }),
    touches,
  });

  const remove = useAction({
    run: (goal: Goal) => deleteGoal(goal.id),
    touches,
    onSuccess: () => setRemoveTarget(null),
  });

  const current = (goals.value?.items ?? []).filter((goal) => isCurrentGoal(goal, now));
  const all = suggestions.value?.suggestions ?? [];

  return cloneElements(children, {
    timeframe,
    setTimeframe,
    targetCount,
    setTargetCount,
    goals,
    suggestions,
    stats,
    current,
    pending: pendingSuggestions(all, current),
    reasons: suggestionReasons(all),
    period: currentPeriod(timeframe, current, now),
    now,
    weeklyHours: weeklyAverageHours(stats.value, GOALS_STATS_DAYS),
    acceptingKey: accept.busy ? (accept.input?.itemKey ?? null) : null,
    togglingId: toggle.busy ? (toggle.input?.id ?? null) : null,
    removeTarget,
    setRemoveTarget,
    removing: remove.busy,
    actionFailed: accept.failed || toggle.failed || remove.failed,
    onAccept: accept.submit,
    onToggle: toggle.submit,
    onConfirmRemove: () => {
      if (removeTarget) remove.submit(removeTarget);
    },
  });
};
