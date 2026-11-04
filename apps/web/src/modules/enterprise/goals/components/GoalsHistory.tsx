"use client";

import { ResourceStatus } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Goal, GoalListResponse } from "@questorylabs/shared";
import { StateMessage } from "@/components/ui";
import { GOAL_DOMAIN_COLOR, goalKindLabel } from "@/lib/goals";
import { formatHours, historyGroups } from "../enterprise.goals.utils";

const ACTION_CLASS =
  "min-h-9 rounded-full border border-white/[0.12] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5";

const isOpen = (goal: Goal, now: Date) => new Date(goal.periodEnd).getTime() > now.getTime();

const goalOutcome = (goal: Goal, now: Date) => {
  if (goal.doneAt) return "Done";
  return isOpen(goal, now) ? "In progress" : "Missed";
};

export const GoalsHistory = ({
  history,
  goals,
  now = new Date(),
  togglingId,
  onToggle,
  onRemove,
}: {
  history: UseResourceResult<GoalListResponse>;
  goals: Goal[];
  now?: Date;
  togglingId: string | null;
  onToggle: (goal: Goal) => void;
  onRemove: (goal: Goal) => void;
}) => (
  <ResourceStatus
    failed={history.failed}
    empty={history.empty}
    loading={
      <StateMessage variant="loading" className="mt-0">
        Loading your past goals…
      </StateMessage>
    }
    error={
      <StateMessage variant="error" className="mt-0">
        Could not load your goal history.
      </StateMessage>
    }
  >
    {goals.length > 0 ? (
      <div className="flex flex-col gap-6">
        {historyGroups(goals).map((group) => (
          <section key={group.key} aria-label={group.title} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
              <h2 className="label-mono text-[11px] text-[var(--faint)]">{group.title}</h2>
              <p className="text-[12px] text-[var(--muted)]">
                {group.done} of {group.goals.length} done
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {group.goals.map((goal) => {
                const color = GOAL_DOMAIN_COLOR[goal.domain];
                return (
                  <li
                    key={goal.id}
                    className="q-row flex flex-wrap items-center gap-x-[18px] gap-y-2 rounded-[22px] border border-white/[0.09] px-5 py-4"
                  >
                    <div className="min-w-0 flex-[1_1_280px]">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                        style={{ color }}
                      >
                        <span
                          aria-hidden="true"
                          className="size-[5px] rounded-full"
                          style={{ background: color }}
                        />
                        {goalKindLabel(goal.kind)}
                      </span>
                      <h3 className="mt-1 text-lg font-normal tracking-[-0.01em]">{goal.name}</h3>
                    </div>
                    {goal.estimatedMinutes != null && goal.estimatedMinutes > 0 ? (
                      <span className="text-sm text-[var(--muted)]">
                        ~{formatHours(goal.estimatedMinutes)}
                      </span>
                    ) : null}
                    <span className="text-[13px] text-[var(--muted)]">{goalOutcome(goal, now)}</span>
                    {isOpen(goal, now) ? (
                      <>
                        <button
                          type="button"
                          disabled={togglingId === goal.id}
                          onClick={() => onToggle(goal)}
                          aria-label={`${goal.doneAt ? "Undo" : "Mark done"}: ${goal.name}`}
                          className={ACTION_CLASS}
                        >
                          {goal.doneAt ? "Undo" : "Mark done"}
                        </button>
                        {goal.doneAt ? null : (
                          <button
                            type="button"
                            onClick={() => onRemove(goal)}
                            aria-label={`Remove ${goal.name}`}
                            className={ACTION_CLASS}
                          >
                            Remove
                          </button>
                        )}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    ) : (
      <p className="px-1 text-sm text-[var(--muted)]">
        No past goals yet. Finished and missed weeks will show up here.
      </p>
    )}
  </ResourceStatus>
);
