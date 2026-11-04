"use client";

import { ResourceStatus } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { AiGoal, AiGoalsResponse } from "@questorylabs/shared";
import { StateMessage } from "@/components/ui";
import { SuggestionRow } from "./SuggestionRow";

const rerollLabel = (left: number, perDay: number) =>
  left > 0
    ? `${left} of ${perDay} rerolls left today`
    : "No rerolls left today";

export const AiGoalsSection = ({
  aiGoals,
  goals,
  acceptingKey,
  rerollingKey,
  rerollError,
  onAccept,
  onReroll,
}: {
  aiGoals: UseResourceResult<AiGoalsResponse>;
  goals: AiGoal[];
  acceptingKey: string | null;
  rerollingKey: string | null;
  rerollError: string | null;
  onAccept: (goal: AiGoal) => void;
  onReroll: (goal: AiGoal) => void;
}) => {
  const rerollsLeft = aiGoals.value?.rerollsLeft ?? 0;
  const rerollsPerDay = aiGoals.value?.rerollsPerDay ?? 0;
  const busy = acceptingKey !== null || rerollingKey !== null;
  return (
    <section aria-labelledby="ai-goals" className="flex flex-col gap-2.5 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 id="ai-goals" className="label-mono text-[11px] text-[var(--faint)]">
          Picked for you
        </h2>
        {aiGoals.value ? (
          <p className="text-[12px] text-[var(--muted)]">
            {rerollLabel(rerollsLeft, rerollsPerDay)}
          </p>
        ) : null}
      </div>
      <ResourceStatus
        failed={aiGoals.failed}
        empty={aiGoals.empty}
        loading={
          <StateMessage variant="loading" className="mt-0">
            Picking goals from your taste…
          </StateMessage>
        }
        error={
          <StateMessage variant="error" className="mt-0">
            Could not load your AI goals.
          </StateMessage>
        }
      >
        {goals.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {goals.map((goal) => (
              <SuggestionRow
                key={goal.itemKey}
                suggestion={goal}
                busy={acceptingKey === goal.itemKey}
                disabled={busy}
                onAccept={onAccept}
                onReroll={rerollsLeft > 0 ? onReroll : undefined}
                rerolling={rerollingKey === goal.itemKey}
              />
            ))}
          </ul>
        ) : (
          <p className="px-1 text-sm text-[var(--muted)]">
            You&apos;ve taken every pick for this period.
          </p>
        )}
      </ResourceStatus>
      {rerollError ? (
        <p role="alert" className="px-1 text-sm text-[var(--danger)]">
          {rerollError}
        </p>
      ) : null}
    </section>
  );
};
