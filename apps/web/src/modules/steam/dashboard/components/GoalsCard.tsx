"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { GoalListResponse } from "@questorylabs/shared";
import { ResourceStatus, SkeletonTile } from "@questorylabs/ui";
import { GOAL_DOMAIN_COLOR, goalKindLabel, goalProgress } from "@/lib/goals";

const goalValue = (goal: GoalListResponse["items"][number]) =>
  goal.targetValue != null && goal.targetValue > 0
    ? `${goal.progressValue} of ${goal.targetValue}`
    : goal.doneAt
      ? "Done"
      : goalKindLabel(goal.kind);

export const GoalsCard = ({ goals }: { goals: UseResourceResult<GoalListResponse> }) => {
  const items = goals.value?.items ?? [];
  return (
    <section
      aria-labelledby="dashboard-goals"
      className="panel q-lift q-in min-w-0 flex-[1_1_260px] px-5 py-[18px]"
      style={{ "--i": 10 } as CSSProperties}
    >
      <div className="flex justify-between">
        <h2 id="dashboard-goals" className="m-0 text-base font-normal">
          Goals
        </h2>
        <Link
          href="/recommendations/goals"
          className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          All
        </Link>
      </div>
      <ResourceStatus
        failed={goals.failed}
        empty={goals.empty}
        loading={<SkeletonTile className="mt-3" />}
        error={
          <p className="mt-3 text-sm text-[var(--danger)]">Could not load goals.</p>
        }
      >
        {items.length ? (
          <ul className="mt-3 flex list-none flex-col gap-3.5 p-0">
            {items.map((goal) => {
              const color = GOAL_DOMAIN_COLOR[goal.domain];
              return (
                <li key={goal.id}>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate">{goal.name}</span>
                    <span className="shrink-0 text-[var(--muted)]">{goalValue(goal)}</span>
                  </div>
                  <div className="mt-[7px] h-[3px] rounded-sm bg-white/[0.07]">
                    <div
                      className="q-bar h-full rounded-sm"
                      style={{
                        width: `${Math.round(goalProgress(goal) * 100)}%`,
                        background: color,
                        boxShadow: `0 0 10px ${color}`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No active goals.{" "}
            <Link href="/recommendations/goals" className="text-[var(--ink)] hover:text-[var(--accent)]">
              Pick some
            </Link>
          </p>
        )}
      </ResourceStatus>
    </section>
  );
};
