"use client";

import { Button, Dialog, PageHeader, ResourceStatus } from "@questorylabs/ui";
import { SegmentedControl } from "@/components/SegmentedControl";
import { StateMessage } from "@/components/ui";
import { AiGoalsSection } from "./components/AiGoalsSection";
import { GoalRow } from "./components/GoalRow";
import { GoalsHistory } from "./components/GoalsHistory";
import { GoalsNoSources } from "./components/GoalsNoSources";
import { GoalsProgress } from "./components/GoalsProgress";
import { SuggestionRow } from "./components/SuggestionRow";
import {
  GOAL_TAB_OPTIONS,
  GOAL_TARGET_COUNTS,
} from "./enterprise.goals.constants";
import type { GoalsViewProps } from "./enterprise.goals.types";

export const GoalsView = (props: Record<string, unknown>) => {
  const {
    tab,
    setTab,
    history,
    pastGoals,
    targetCount,
    setTargetCount,
    goals,
    suggestions,
    aiGoals,
    pendingAi,
    noSources,
    rerollingKey,
    rerollError,
    onReroll,
    current,
    pending,
    reasons,
    period,
    now,
    weeklyHours,
    acceptingKey,
    togglingId,
    removeTarget,
    setRemoveTarget,
    removing,
    actionFailed,
    onAccept,
    onToggle,
    onConfirmRemove,
  } = props as GoalsViewProps;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <PageHeader
        className="mb-0 px-1 pt-2"
        eyebrow="Smart goals"
        title={
          <>
            A list you&apos;ll{" "}
            <span className="font-serif text-[#a1a1a6]">actually finish</span>
          </>
        }
        description="A realistic list to finish, sized to the time you actually have."
        actions={
          <>
            <SegmentedControl
              label="Goals view"
              value={tab}
              onChange={setTab}
              options={GOAL_TAB_OPTIONS}
            />
            {tab === "week" ? (
              <label className="flex min-h-[46px] items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/25 px-3.5 text-[13px] text-[var(--muted)]">
                Target
                <select
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className="border-0 bg-transparent text-[13px] text-[var(--ink)]"
                  aria-label="Target count"
                >
                  {GOAL_TARGET_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        }
      />

      {tab === "history" ? (
        <GoalsHistory
          history={history}
          goals={pastGoals}
          togglingId={togglingId}
          onToggle={onToggle}
          onRemove={setRemoveTarget}
        />
      ) : null}

      {tab === "history" && actionFailed ? (
        <p role="alert" className="px-1 text-sm text-[var(--danger)]">
          That change didn&apos;t save. Try again.
        </p>
      ) : null}

      {tab === "week" && noSources ? <GoalsNoSources /> : null}

      {tab === "history" || noSources ? null : (
        <>
        <ResourceStatus
          failed={goals.failed}
          empty={goals.empty}
          loading={<StateMessage variant="loading" className="mt-0">Loading your goals…</StateMessage>}
          error={
            <StateMessage variant="error" className="mt-0">
              Could not load your goals.
            </StateMessage>
          }
        >
          <GoalsProgress
            goals={current}
            period={period}
            now={now}
            weeklyHours={weeklyHours}
          />
          {current.length > 0 ? (
            <ol className="flex flex-col gap-2.5">
              {current.map((goal, i) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  index={i}
                  reason={goal.targetRef ? reasons[goal.targetRef] : undefined}
                  busy={togglingId === goal.id}
                  onToggle={onToggle}
                  onRemove={setRemoveTarget}
                />
              ))}
            </ol>
          ) : null}
        </ResourceStatus>

        {actionFailed ? (
          <p role="alert" className="px-1 text-sm text-[var(--danger)]">
            That change didn&apos;t save. Try again.
          </p>
        ) : null}

        <AiGoalsSection
          aiGoals={aiGoals}
          goals={pendingAi}
          acceptingKey={acceptingKey}
          rerollingKey={rerollingKey}
          rerollError={rerollError}
          onAccept={onAccept}
          onReroll={onReroll}
        />

        <section aria-labelledby="goal-suggestions" className="flex flex-col gap-2.5 pt-2">
          <h2 id="goal-suggestions" className="label-mono px-1 text-[11px] text-[var(--faint)]">
            Suggestions
          </h2>
          <ResourceStatus
            failed={suggestions.failed}
            empty={suggestions.empty}
            loading={
              <StateMessage variant="loading" className="mt-0">
                Loading your backlog goals…
              </StateMessage>
            }
            error={
              <StateMessage variant="error" className="mt-0">
                {(suggestions.error as Error | null)?.message ?? "Could not load suggestions."}
              </StateMessage>
            }
          >
            {pending.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {pending.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.itemKey}
                    suggestion={suggestion}
                    busy={acceptingKey === suggestion.itemKey}
                    disabled={acceptingKey !== null}
                    onAccept={onAccept}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-1 text-sm text-[var(--muted)]">Backlog looks clear — nice work.</p>
            )}
          </ResourceStatus>
        </section>
        </>
      )}

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove this goal?"
      >
        <p className="text-sm text-[var(--muted)]">
          {removeTarget?.name} will be removed from your list. You can accept it again
          if it is still suggested.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirmRemove} disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
