"use client";

import { useState, type PropsWithChildren } from "react";
import { useAction, useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { AiGoal, Goal, PlaySessionStats } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { browserTimeZone, withTz } from "@/lib/dates";
import { fetchAiGoals, fetchSmartGoals, rerollAiGoal } from "@/lib/enterprise-api";
import type { GoalSuggestion } from "@/lib/enterprise-types";
import { createGoal, deleteGoal, fetchGoals, updateGoal } from "@/lib/goals";
import {
  AI_GOALS_RESOURCE_ID,
  GOALS_HISTORY_LIMIT,
  GOALS_LIST_LIMIT,
  GOALS_RESOURCE_ID,
  GOALS_STATS_DAYS,
  GOAL_DEFAULT_TARGET,
  GOAL_TIMEFRAME,
  SMART_GOAL_TIMEFRAME,
  type GoalsTab,
} from "./enterprise.goals.constants";
import {
  currentPeriod,
  historyGoals,
  isCurrentGoal,
  pendingSuggestions,
  suggestionReasons,
  weeklyAverageHours,
} from "./enterprise.goals.utils";

export const GoalsController = ({ children }: PropsWithChildren) => {
  const [tab, setTab] = useState<GoalsTab>("week");
  const [targetCount, setTargetCount] = useState(GOAL_DEFAULT_TARGET);
  const [removeTarget, setRemoveTarget] = useState<Goal | null>(null);
  const now = new Date();

  const goals = useResource({
    id: [...GOALS_RESOURCE_ID, GOAL_TIMEFRAME],
    load: () =>
      fetchGoals({ status: "all", timeframe: GOAL_TIMEFRAME, limit: GOALS_LIST_LIMIT }),
    freshFor: 30_000,
    retries: 1,
  });

  const history = useResource({
    id: [...GOALS_RESOURCE_ID, "history"],
    load: () => fetchGoals({ status: "all", limit: GOALS_HISTORY_LIMIT }),
    when: tab === "history",
    freshFor: 30_000,
    retries: 1,
  });

  const suggestions = useResource({
    id: ["enterprise-goals", targetCount],
    load: () => fetchSmartGoals({ timeframe: SMART_GOAL_TIMEFRAME, targetCount }),
    freshFor: 60_000,
    retries: 1,
  });

  const aiGoals = useResource({
    id: [...AI_GOALS_RESOURCE_ID],
    load: () => fetchAiGoals(),
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
    run: (suggestion: GoalSuggestion | AiGoal) =>
      createGoal({
        kind: suggestion.kind,
        name: suggestion.name,
        domain: suggestion.domain,
        estimatedMinutes:
          suggestion.estimatedTimeMinutes != null
            ? Math.round(suggestion.estimatedTimeMinutes)
            : null,
        targetRef: suggestion.itemKey,
        timeframe: GOAL_TIMEFRAME,
        tz: browserTimeZone(),
      }),
    touches,
  });

  const reroll = useAction({
    run: (goal: AiGoal) => rerollAiGoal(goal.itemKey),
    touches: [[...AI_GOALS_RESOURCE_ID]],
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
  const ai = aiGoals.value?.goals ?? [];
  const aiKeys = new Set(ai.map((goal) => goal.itemKey));

  return cloneElements(children, {
    tab,
    setTab,
    history,
    pastGoals: historyGoals(history.value?.items ?? [], now),
    targetCount,
    setTargetCount,
    goals,
    suggestions,
    stats,
    current,
    aiGoals,
    pendingAi: pendingSuggestions(ai, current),
    noSources: aiGoals.value?.status === "no_sources" && current.length === 0,
    rerollingKey: reroll.busy ? (reroll.input?.itemKey ?? null) : null,
    rerollError: reroll.failed ? (reroll.error?.message ?? "Could not reroll that goal.") : null,
    onReroll: reroll.submit,
    pending: pendingSuggestions(all, current).filter((s) => !aiKeys.has(s.itemKey)),
    reasons: suggestionReasons([...all, ...ai]),
    period: currentPeriod(GOAL_TIMEFRAME, current, now),
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
